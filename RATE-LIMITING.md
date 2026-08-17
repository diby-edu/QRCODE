# Rate limiting nginx — plan d'application

Rédigé le 2026-08-15, à appliquer plus tard. Rien n'a encore été modifié sur
le VPS. Ce document remplace la section « rate limiting » de `DEPLOY.md`,
dont les instructions se sont révélées inexactes (voir § 4).

---

## 1. Cartographie du VPS (relevée le 2026-08-15)

Le serveur `srv1230238` (72.62.148.170) héberge **8 sites nginx et 10 process
PM2**. Toute modification de nginx les concerne potentiellement tous.

| Site nginx | Domaine | Vers |
|---|---|---|
| `qrhub` | qrcode.numerik360.com | 127.0.0.1:**3100** |
| `qrhub-test.numerik360.com` | test.numerik360.com | 127.0.0.1:**3100** — domaine personnalisé client (§ 3.1) |
| `whatsai` | whatsai.duckdns.org | localhost:3000 |
| `wazzapai.com` | wazzapai.com, www | localhost:3000 |
| `textopro` | sms.numerik360.com | :3007 |
| `repetiteur` | repetiteur.numerik360.com | :3004 |
| `photopilot` | photopilot.duckdns.org | — |
| `numerik360.com` | numerik360.com, www | — |

Process PM2 : `qrhub` (3100), `whatsai-web` (3000), `whatsai-bot`,
`textopro` (3007), `textopro-webhook`, `repetiteur` (3004),
`photopilot-web`, `photopilot-bridge`, `vps-webhook`, `numerik360-api`.

---

## 2. L'agent SaaS WhatsApp change-t-il l'analyse ? Non.

C'était la bonne question à poser : si un autre projet du VPS appelait
l'API de QRHub en serveur-à-serveur, **tout son trafic arriverait d'une seule
adresse IP** et une limite par IP l'étranglerait d'un coup.

Vérifié, ce n'est pas le cas :

- Recherche des chaînes `qrcode.numerik360.com`, `127.0.0.1:3100` et
  `localhost:3100` dans `/root/WhatsAI`, `/root/numerik360-api`,
  `/var/www/textopro`, `/var/www/photopilot`, `/var/www/repetiteur` :
  **aucune référence**. Aucun projet n'appelle QRHub.
- WhatsAI (`wazzapai.com` et `whatsai.duckdns.org`) tourne sur le **port
  3000**, dans un bloc `server` distinct, avec son propre process PM2. Il
  n'a aucun point de contact avec QRHub.

**Point à retenir sur le mécanisme** : `limit_req_zone` ne fait qu'allouer de
la mémoire partagée. Une limite ne s'applique QUE là où une directive
`limit_req` est écrite. Déclarer des zones globalement n'impose donc rien aux
autres sites — ils ne sont pas concernés tant qu'on ne touche pas à leurs
blocs. Les webhooks WhatsApp de Meta, en particulier, ne sont pas affectés.

---

## 3. Ce qui change vraiment l'analyse

### 3.1. Les domaines personnalisés clients ne servent que `/q/`

`test.numerik360.com` proxifie bien vers `127.0.0.1:3100`, mais ce n'est pas
un environnement de test : c'est un **domaine personnalisé actif**, créé par
`scripts/add-custom-domain.sh` (d'où le nom de fichier `qrhub-<domaine>`) pour
valider la fonctionnalité proposée aux clients Pro. Il est enregistré dans
`custom_domains` avec le statut `active` depuis le 2026-07-18, et un QR y est
rattaché.

`src/proxy.ts` fait exactement ce qu'il faut : sur un domaine personnalisé
actif, tout ce qui n'est pas `/q/` renvoie 404. Vérifié en ligne :

| | test.numerik360.com | qrcode.numerik360.com |
|---|---|---|
| `/q/i4w10scl` | **200** ✅ | 200 |
| `/` | 404 | 200 |
| `/auth/login` | 404 | 200 |
| `/admin` | 404 | 307 |
| `/api/health` | 404 | 200 |
| `/robots.txt` | 404 | 200 |

**Il n'y a donc aucun contournement possible** : `/auth/` et `/api/` ne sont
pas joignables depuis un domaine client. Le rate limiting n'a besoin d'être
posé que sur le fichier `qrhub` du domaine principal. Aucune indexation
parasite non plus, puisque `robots.txt` et `/` y renvoient 404.

**Conséquence pour la suite** : chaque client Pro qui active un domaine génère
un nouveau fichier nginx via le script. Comme ces blocs ne servent que `/q/`,
et que `/q/` n'est volontairement pas limité (§ étape 4), il n'y a rien à
ajouter au script aujourd'hui. **Mais si un jour on décide de limiter `/q/`,
il faudra modifier le modèle dans `scripts/add-custom-domain.sh`** — sinon
chaque domaine client restera sans limite, et là le contournement existerait.

Détail mineur relevé au passage : le bloc généré par le script ne reprend pas
les réglages de buffers (`proxy_buffer_size 16k`, `proxy_buffers 4 16k`,
`proxy_busy_buffers_size 32k`) ajoutés à la main dans le fichier du domaine
principal. Les pages de scan les plus lourdes (type Entreprise avec galerie)
pourraient se comporter différemment chez un client. À aligner un jour.

### 3.2. Le journal d'accès est partagé entre les 8 sites

`nginx.conf` déclare `access_log /var/log/nginx/access.log` une seule fois, et
**aucun site ne définit le sien**. Tout est mélangé.

Conséquence : impossible de mesurer le trafic réel de QRHub. Les chiffres que
j'avais relevés au départ étaient trompeurs — sur les 205 requêtes `/api/`
observées, la majorité (`/api/admin/alerts`, `/api/dashboard/test-account-status`,
`/api/plans`, `/api/public/runtime-config`, `/api/auth/session`) **n'existe pas
dans QRHub**, dont les seules routes API sont `export`, `health`, `paydunya`
et `upload`. Ces requêtes appartiennent à un autre projet.

D'où une étape ajoutée au plan : donner à QRHub son propre journal, sans quoi
on règle les seuils à l'aveugle.

### 3.3. Le trafic réel de QRHub est aujourd'hui quasi nul

Sur la journée du 15/08 : **1 requête `/q/`** (mon propre test) et **1 requête
`/auth/`**. Les seuils proposés ont donc une marge considérable.

En revanche, un enseignement utile vient d'un autre projet : `/api/admin/alerts`
a été appelée 174 fois dans la journée, avec un pic de **46 requêtes/minute
depuis une seule IP** — le profil typique d'un tableau de bord qui interroge
son API en boucle. QRHub ne fait aujourd'hui aucun appel de ce type (tout est
rendu côté serveur ; le seul `fetch` client est `/api/upload`). **Si un jour on
ajoute du rafraîchissement automatique dans le dashboard, il faudra relever la
limite `/api/` avant.**

---

## 4. Correction : ce que `DEPLOY.md` conseillait à tort

L'ancienne section proposait `include /etc/nginx/proxy_params;` dans les
nouveaux blocs `location`. C'est faux pour ce site :

| | `proxy_params` du système | `location /` actuel de QRHub |
|---|---|---|
| En-tête Host | `$http_host` (brut, avec le port) | `$host` (normalisé) |
| HTTP/1.1 | absent | `proxy_http_version 1.1` |
| WebSocket | absent | `Upgrade` + `Connection` |
| Taille du corps | absente | `client_max_body_size 25m` |
| Buffers | absents | 3 directives réglées |

Les nouvelles routes auraient donc eu un comportement différent du reste du
site, et le `Host` modifié risquait de perturber la détection de domaine
personnalisé dans `src/proxy.ts`. Le plan ci-dessous utilise un extrait qui
**recopie à l'identique** la configuration existante.

---

## 5. Le plan d'application

### Étape 1 — Sauvegardes

```bash
cp /etc/nginx/sites-available/qrhub /etc/nginx/sites-available/qrhub.bak-AAAAMMJJ
```

Un seul fichier à sauvegarder : les domaines personnalisés clients ne servent
que `/q/`, qui n'est pas limité (§ 3.1).

`nginx.conf` n'est **pas** modifié : il contient déjà
`include /etc/nginx/conf.d/*.conf;`, ce qui permet de déclarer les zones dans
un fichier neuf et isolé. Pour tout annuler, il suffira de le supprimer.

### Étape 2 — Les zones : `/etc/nginx/conf.d/qrhub-ratelimit.conf` (fichier neuf)

```nginx
# Rate limiting QRHub. Fichier isolé : nginx.conf, partagé avec 7 autres
# sites, n'est pas touché. Pour tout annuler : supprimer ce fichier.
#
# Seules les soumissions de formulaire sont comptées : une clé vide fait
# ignorer la requête par nginx. Les chargements de page et les préchargements
# Next.js ne consomment donc rien, et une attaque par bourrage
# d'identifiants — qui n'est faite que de POST — est visée précisément.
map $request_method $qrhub_auth_key {
    POST    $binary_remote_addr;
    default "";
}

limit_req_zone $qrhub_auth_key      zone=qrhub_auth:10m rate=30r/m;
limit_req_zone $binary_remote_addr  zone=qrhub_api:10m  rate=60r/m;
```

### Étape 3 — L'extrait partagé : `/etc/nginx/snippets/qrhub-proxy.conf` (fichier neuf)

Copie **exacte** du contenu actuel de `location /`, pour que les nouvelles
routes se comportent rigoureusement comme aujourd'hui :

```nginx
proxy_pass http://127.0.0.1:3100;
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
client_max_body_size 25m;
proxy_buffer_size 16k;
proxy_buffers 4 16k;
proxy_busy_buffers_size 32k;
```

### Étape 4 — Les deux fichiers de site

Dans le seul fichier `qrhub`, bloc `listen 443` uniquement — les blocs de
redirection HTTP et les lignes « managed by Certbot » ne bougent pas :

```nginx
    access_log /var/log/nginx/qrhub-access.log;   # journal dédié (§ 3.2)

    location / {
        include /etc/nginx/snippets/qrhub-proxy.conf;
    }

    location /auth/ {
        limit_req zone=qrhub_auth burst=30 nodelay;
        limit_req_status 429;
        include /etc/nginx/snippets/qrhub-proxy.conf;
    }

    location /api/ {
        limit_req zone=qrhub_api burst=30 nodelay;
        limit_req_status 429;
        include /etc/nginx/snippets/qrhub-proxy.conf;
    }
```

`limit_req_status 429` est indispensable : par défaut nginx renvoie **503**,
qui signifie « serveur en panne » et que les moteurs de recherche comme les
sondes de supervision interprètent mal.

`/q/` (les scans) n'est **volontairement pas limité** : c'est le flux le plus
précieux, le plus exposé au NAT des opérateurs — une foule scannant la même
affiche peut partager quelques IP — et le seul vrai risque (épuiser le quota
de 45 req/min d'ip-api.com) se traite mieux par un cache dans
`src/lib/scan/track.ts`, sur le modèle de celui qui existe déjà dans
`src/lib/analytics/track-visit.ts`.

### Étape 5 — Validation, puis seulement ensuite rechargement

```bash
nginx -t
```

Analyse toute la configuration **sans rien recharger**. Tant que la sortie
n'affiche pas `syntax is ok` et `test is successful`, on ne va pas plus loin :
les 8 sites continuent de tourner sur la configuration chargée en mémoire.

```bash
systemctl reload nginx
```

`reload`, jamais `restart` : les nouveaux processus prennent la relève pendant
que les anciens terminent les requêtes en cours. Aucune coupure.

### Étape 6 — Retour arrière

```bash
rm /etc/nginx/conf.d/qrhub-ratelimit.conf
cp /etc/nginx/sites-available/qrhub.bak-AAAAMMJJ /etc/nginx/sites-available/qrhub
nginx -t && systemctl reload nginx
```

---

## 6. Vérifications après application

**Le vrai risque, ce n'est pas QRHub — ce sont les 7 autres sites.** À
contrôler en premier :

```
numerik360.com · wazzapai.com · whatsai.duckdns.org · sms.numerik360.com
repetiteur.numerik360.com · photopilot.duckdns.org · test.numerik360.com
```

Tous doivent continuer de répondre (200 ou 301), et `pm2 list` doit montrer
les 10 process `online` avec un compteur de redémarrages inchangé.

Ensuite, que la limite fonctionne : envoyer 50 POST rapides sur
`/auth/login` depuis une même IP. Attendu ≈ 30 réponses `200` puis des `429`.
Et vérifier qu'une connexion normale et un scan réel passent toujours.

---

## 7. Les seuils, et ce qu'ils autorisent

Avec `rate=30r/m` et `burst=30`, une même IP dispose de 31 requêtes
instantanées, 60 sur une minute, 180 sur cinq minutes. Comme seuls les POST
sont comptés (§ étape 2), une tentative de connexion = 1 requête. Donc :

- ~31 personnes se connectant dans les mêmes secondes derrière une seule IP
- 60 tentatives par minute
- un robot ramené de plusieurs milliers de tentatives/minute à 30

Le critère n'est jamais le nombre total de clients, mais **combien
d'utilisateurs partagent une même IP publique et se connectent dans la même
minute**. Pour une clientèle dispersée, ce nombre reste à 1 ou 2 même avec
des milliers de comptes. Le seul cas tendu serait une entreprise cliente dont
20+ salariés se connectent simultanément depuis le réseau du bureau.

**Pour piloter plutôt que deviner**, une fois le journal dédié en place :

```bash
grep 'zone="qrhub_auth"' /var/log/nginx/error.log | wc -l
```

Zéro ligne = marge confortable. Des lignes venant toutes de la même IP = un
client entreprise : on relève le `rate`, sans redéploiement ni coupure.

---

## 8. Décisions arrêtées (2026-08-15)

**1. Journal d'accès dédié : oui**, sur le seul fichier `qrhub`
(`access_log /var/log/nginx/qrhub-access.log;`, déjà inscrit à l'étape 4).

Sans lui, les seuils se règlent à l'aveugle — l'erreur a d'ailleurs été
commise pendant cet audit (§ 3.2). Volontairement limité au domaine
principal : le rate limiting ne porte que sur `/auth/` et `/api/`, qui
n'existent que là, les domaines clients renvoyant 404 sur tout sauf `/q/`.
Ajouter le journal au modèle de `scripts/add-custom-domain.sh` n'apporterait
que les scans, déjà enregistrés en base dans `qr_scans` avec bien plus de
détail (appareil, navigateur, OS, pays).

Coût opérationnel nul, vérifié : `/etc/logrotate.d/nginx` couvre
`/var/log/nginx/*.log` — rotation quotidienne, 14 jours, compression. Rien à
configurer, et 33 Go libres sur 49.

**2. `/q/` reste sans limite** — et la cause a été traitée dans le code.

Le coût d'un faux positif y est asymétrique : un 429 sur `/auth/`, c'est un
client qui réessaie ; un 429 sur `/q/`, c'est le client DU client qui voit une
erreur au lieu de la page attendue, avec le NAT des opérateurs mobiles qui
rend le scénario plausible dès qu'une foule scanne la même affiche.

Le risque réel — épuiser le quota de 45 requêtes/minute d'ip-api.com et priver
tout le monde des statistiques pays/ville — est désormais traité à la source :
`src/lib/scan/track.ts` dispose d'un cache réseau → géolocalisation d'une
heure, comme `track-visit.ts`. La clé étant l'IP déjà tronquée, un `/24`
entier partage une seule entrée. Mesuré : **1 000 scans depuis un même réseau
= 1 appel à ip-api.com au lieu de 1 000**. Les échecs réseau ne sont pas mis
en cache (nouvelle tentative au scan suivant) et les entrées expirées sont
purgées au-delà de 5 000 clés.

Reste ouvert pour l'avenir : si `/q/` devait un jour être limité, il faudrait
modifier le modèle de `scripts/add-custom-domain.sh`, sinon chaque domaine
client échapperait à la règle (§ 3.1).
