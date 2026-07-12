# Déploiement QRHub sur VPS (PM2 + nginx)

## 1. Prérequis

- VPS Linux (Ubuntu 22.04+ recommandé) avec Node.js **22+** et npm
- Un sous-domaine pointant vers l'IP du VPS (enregistrement DNS `A`)
- Projet Supabase (les clés sont dans `.env.local`)
- Compte PayDunya avec clés API (mode test puis live)

## 2. Récupérer le code

```bash
mkdir -p /var/www/qrhub && cd /var/www/qrhub
git clone https://github.com/diby-edu/QRCODE.git .
```

Le dépôt ne contient jamais `.env.local` (il est dans `.gitignore` — seul
`.env.example`, sans secrets, y est) : à créer manuellement à l'étape
suivante.

## 3. Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret !) |
| `DATABASE_URL` | Supabase → Connect → Connection String → URI **« Session pooler »** (port 5432, hôte `*.pooler.supabase.com`). Sert uniquement aux migrations — l'app passe par l'API Supabase. Éviter le Transaction pooler (6543) et la connexion directe (IPv6 seulement). |
| `NEXT_PUBLIC_APP_URL` | `https://qrcode.numerik360.com` (sans / final) |
| `PAYDUNYA_MASTER_KEY` etc. | PayDunya → Intégrations → Clés API |
| `PAYDUNYA_MODE` | `test` (sandbox) puis `live` en production |

⚠️ `NEXT_PUBLIC_APP_URL` détermine l'URL encodée dans les QR dynamiques
(`<APP_URL>/q/<slug>`). La changer après coup n'invalide pas les QR déjà
imprimés tant que le domaine continue de répondre.

## 4. Migrations de base de données

```bash
npm install
npm run db:migrate
```

Le script applique `supabase/migrations/*.sql` dans l'ordre et note ce qui a
déjà été appliqué (table `_migrations`) : on peut le relancer sans risque.

## 5. Compte administrateur

Après avoir créé votre compte via l'interface (`/auth/register`), dans le
SQL Editor de Supabase :

```sql
update public.profiles set role = 'admin'
where email = 'votre-email@exemple.com';
```

## 6. VPS mutualisé : choisir un port libre

Plusieurs projets tournent déjà sur ce VPS. **nginx ne pose aucun problème**
(tous les sites partagent 80/443, chacun avec son bloc `server_name`) ; seul
le **port interne Node** de QRHub doit être unique. Avant de démarrer :

```bash
pm2 list                    # ports/process des autres projets PM2
ss -tlnp | grep LISTEN      # tous les ports réellement occupés
```

QRHub est configuré sur le port **3100** dans `ecosystem.config.cjs` — s'il
est pris, changez `PORT` dans ce fichier (et dans le bloc nginx ci-dessous).
L'app écoute sur `127.0.0.1` uniquement : elle n'est joignable que via nginx,
jamais directement depuis l'extérieur.

## 7. Build et démarrage

```bash
npm run build
# Le build standalone a besoin des assets à côté du serveur :
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/

pm2 start ecosystem.config.cjs
pm2 save && pm2 startup     # relance au reboot (une seule fois)
```

`pm2 logs qrhub` pour vérifier le démarrage, `pm2 restart qrhub` après une
mise à jour.

## 8. nginx (reverse proxy)

Un bloc de plus à côté de ceux de vos autres projets —
`/etc/nginx/sites-available/qrhub` :

```nginx
server {
    listen 80;
    server_name qrcode.numerik360.com;

    location / {
        proxy_pass http://127.0.0.1:3100;   # = PORT de ecosystem.config.cjs
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # Indispensable : IP réelle du visiteur pour la géolocalisation des scans
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 25m;   # uploads PDF/images/MP3
    }
}
```

```bash
ln -s /etc/nginx/sites-available/qrhub /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 9. HTTPS (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx   # déjà installé si un autre projet l'utilise
certbot --nginx -d qrcode.numerik360.com
```

Certbot ajoute le certificat de ce sous-domaine sans toucher à ceux de vos
autres projets, et renouvelle automatiquement.

## 10. PayDunya

- L'IPN (`https://votre-sous-domaine/api/paydunya/ipn`) doit être accessible
  publiquement — il l'est dès que le site est en ligne. En local, la page de
  retour `/billing?token=…` vérifie aussi le paiement : le test de bout en
  bout fonctionne même sans IPN joignable.
- Mode test : payer avec les numéros fictifs fournis par la sandbox PayDunya.
- Passage en production : `PAYDUNYA_MODE=live` + clés live, puis
  `pm2 restart qrhub`.

## 11. Mise à jour Node.js 20 → 22

`@supabase/*` réclame Node ≥ 22 (avertissement `EBADENGINE` à chaque `npm
install`/`build` sinon). **Le VPS est mutualisé** (numerik360-api,
photopilot, textopro, whatsai...) : ne pas remplacer le Node système en
place, ça casserait potentiellement les autres projets. On installe Node 22
**à côté** via nvm, et on épingle uniquement qrhub dessus.

```bash
# Si nvm n'est pas déjà installé sur le VPS :
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc

nvm install 22
nvm which 22   # note le chemin exact, ex: /root/.nvm/versions/node/v22.20.0/bin/node
```

Mettre à jour `interpreter` dans `ecosystem.config.cjs` avec le chemin
obtenu (déjà présent dans le repo avec une valeur par défaut à ajuster) :

```js
interpreter: "/root/.nvm/versions/node/v22.20.0/bin/node",
```

Puis reconstruire et relancer normalement (§ 12 ci-dessous) :

```bash
git pull
npm install       # avec le Node 22 actif dans le shell (nvm use 22)
npm run build
pm2 delete qrhub  # nécessaire pour que PM2 relise le nouveau champ interpreter
pm2 start ecosystem.config.cjs
pm2 save
```

Vérifier ensuite `pm2 show qrhub` → `node.js version` doit afficher 22.x, et
que le site répond toujours normalement. Les autres process PM2 du VPS ne
sont pas affectés (ils gardent leur propre `interpreter`/Node système).

## 12. Mises à jour

⚠️ `npm run build` régénère entièrement `.next/standalone/` à chaque fois —
**il faut recopier `.env.local` après CHAQUE build**, sinon l'app perd
silencieusement toutes ses variables serveur (clés PayDunya, clé
service_role Supabase…) au redémarrage suivant, sans erreur au démarrage :
les échecs n'apparaissent qu'à l'usage (paiement, uploads, etc.).

```bash
git pull
npm install
npm run db:migrate  # nouvelles migrations éventuelles
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/
pm2 restart qrhub
```
