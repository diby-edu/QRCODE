# Plan — SaaS de génération de QR Codes (Next.js + Supabase + PayDunya)

## Contexte

Création d'une application SaaS complète de génération de QR codes (statiques et dynamiques) avec statistiques de scans, personnalisation visuelle, et monétisation freemium. Projet neuf (aucun code existant), créé dans `C:\Users\konoi\qr-saas`.

Décisions validées avec l'utilisateur :
- **Architecture** : Next.js (App Router) hébergé sur son VPS, derrière son sous-domaine. La route de scan `/q/[slug]` est traitée côté serveur (1 aller-retour : vérifications + tracking + redirection/rendu).
- **Backend** : projet Supabase **existant** (Auth, Postgres, Storage). L'utilisateur fournira après validation : URL du projet, clé anon, clé service_role, chaîne de connexion DB (pour que je lance les migrations moi-même).
- **Paiement** : **PayDunya intégration complète** (pas Stripe) — Orange Money, MTN MoMo, Moov, Wave, cartes. Mode test d'abord ; clés API fournies par l'utilisateur. Couche d'abstraction "gateway" pour ajouter d'autres passerelles plus tard.
- **Tarification** : freemium (Free/Pro) avec **limites et prix configurables dans le dashboard admin** (pas de valeurs codées en dur).
- **Admin complet** : config des plans, gestion des utilisateurs (suspendre, changer de plan, supprimer), vue de tous les QR, stats globales, historique paiements, paramètres du site.
- **UI bilingue FR/EN** (i18n, français par défaut), design moderne inspiré QR Tiger / QRCode Monkey / Beaconstac, responsive, animations légères.

## Stack technique

| Besoin | Choix |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) — build `standalone` pour le VPS |
| Styles | Tailwind CSS v4 + composants maison (pas de lib UI lourde) |
| Supabase | `@supabase/supabase-js` + `@supabase/ssr` (sessions par cookies) |
| Génération QR | `qr-code-styling` (couleurs, styles de points, logo, export PNG/SVG natif) |
| Export PDF | `jspdf` (PNG haute résolution embarqué) |
| Graphiques | `recharts` (suivre le skill dataviz au moment de coder les graphes) |
| i18n | `next-intl` (FR défaut, EN) |
| Détection appareil | `ua-parser-js` (côté serveur, sur la route de scan) |
| Géolocalisation IP | API `ip-api.com` (gratuite) appelée côté serveur, échec silencieux si indisponible |
| Animations | `framer-motion` (transitions légères uniquement) |
| Process VPS | PM2 + nginx reverse proxy (docs fournies) |

## Schéma base de données (migrations SQL Supabase)

Tables demandées par l'utilisateur + extensions nécessaires (plans configurables, admin, dossiers) :

- **profiles** — id (FK auth.users), full_name, avatar_url, role (`user`/`admin`), language, is_suspended, created_at. Trigger de création auto à l'inscription.
- **plans** — id, name, description, price_monthly, currency (XOF), limits **JSONB** (`max_qr_codes`, `max_dynamic`, `max_scans_month`, `logo_enabled`, `formats`, `stats_level`…), is_active, sort_order. *Seedées Free + Pro, entièrement éditables par l'admin.*
- **subscriptions** — id, user_id, plan_id, status (`active`/`expired`/`cancelled`), current_period_start/end, gateway.
- **payments** — id, user_id, subscription_id, gateway (`paydunya`), gateway_ref (token facture), amount, currency, status, raw_response JSONB, created_at.
- **folders** — id, user_id, name, color, created_at.
- **qr_codes** — id, user_id, folder_id, type, title, slug (unique, court), qr_image, is_dynamic, is_active, expires_at, password (hashé bcrypt), scan_count, design JSONB (couleurs, style points, logo), created_at, updated_at.
- **qr_code_data** — id, qr_code_id, data JSONB (contenu propre à chaque type).
- **qr_scans** — id, qr_code_id, country, city, device, browser, operating_system, ip_address, scanned_at.
- **site_settings** — key, value JSONB (nom du site, logo, emails, réglages généraux — admin).

**RLS** : activée partout. Chaque utilisateur n'accède qu'à ses propres lignes (`user_id = auth.uid()`). Fonction `is_admin()` (security definer) pour les politiques admin. `plans` et `site_settings` : lecture publique, écriture admin. `qr_scans` : aucune politique publique — insertion uniquement via la clé service_role sur la route de scan ; lecture par le propriétaire du QR. RPC `record_scan()` : insert + incrément atomique de `scan_count`.

**Storage** : buckets `logos` (logos de QR), `uploads` (PDF, images, MP3 — dossier par user, politiques par préfixe `user_id/`), `qr-previews` (aperçus PNG générés).

## Types de QR (≈20 types, 6 catégories)

Chaque type = une entrée dans un **registre central** (`src/lib/qr-types/registry.ts`) définissant : icône, catégorie, schéma de formulaire (champs + validation zod), encodeur statique (si applicable), et composant de page publique. Les formulaires et pages publiques sont générés à partir de ce registre — pas de duplication.

| Catégorie | Types | Comportement au scan |
|---|---|---|
| Liens | Site web, Facebook, Instagram, Vidéo, Applications (App Store/Play Store avec détection OS), Liste de liens | Redirection 302 (liste de liens → page type Linktree) |
| Contact | vCard, WhatsApp, Email, Téléphone | vCard → page profil + téléchargement .vcf ; autres → redirection `wa.me:`/`mailto:`/`tel:` |
| Réseaux sociaux | Hub multi-réseaux | Page publique avec boutons vers chaque réseau |
| Business | Entreprise, Menu restaurant, Bon de réduction, Paiement | Pages publiques rendues côté serveur (menu par sections, coupon avec code, etc.) |
| Contenu | PDF, Images, MP3, Texte | Upload vers Storage → visionneuse PDF / galerie / lecteur audio / page texte |
| Utilitaires | Wi-Fi, Géolocalisation, Événement | Statiques par défaut (`WIFI:`, `geo:`, fichier ICS) ; version dynamique possible |

**Statique vs dynamique** : Wi-Fi, géo, texte, email, téléphone, vCard peuvent être encodés directement (statique). Tous les types existent en dynamique (URL courte `https://<sous-domaine>/q/<slug>`). Le choix est proposé dans le créateur quand les deux sont possibles.

## Route de scan `/q/[slug]` (cœur du produit)

Route server-side (client Supabase service_role, jamais exposé) :
1. Charge le QR par slug → 404 stylisée si inconnu.
2. Vérifie `is_active` (page "QR désactivé"), `expires_at` (page "QR expiré"), `password` (formulaire de mot de passe, vérif bcrypt, cookie de session courte).
3. Enregistre le scan sans bloquer la réponse : IP (`x-forwarded-for` derrière nginx), géo via ip-api.com (timeout court, échec silencieux), appareil/navigateur/OS via ua-parser-js → `record_scan()`.
4. Répond : redirection 302 (types "lien") ou page publique rendue serveur (types "landing"), avec métadonnées OpenGraph.

## Structure des routes

```
/                    Landing marketing (héros, features, tarifs, i18n)
/pricing             Tarifs (lit la table plans)
/auth/{login,register,forgot-password,reset-password,callback}
/q/[slug]            Scan public (voir ci-dessus)
--- authentifié (middleware) ---
/dashboard           KPIs (total QR, total scans, scans 30j), QR récents, graphe de scans
/qr                  Liste : recherche, filtres (type, statut, dossier), duplication, suppression
/qr/new              Choix du type (grille par catégorie) → formulaire → personnalisation → live preview
/qr/[id]/edit        Édition (contenu dynamique modifiable sans changer le QR, activer/désactiver, expiration, mot de passe)
/qr/[id]/stats       Graphes : scans/jour, pays, villes, appareils, OS, navigateurs + table des scans
/folders             Gestion des dossiers
/settings            Profil, mot de passe, langue
/billing             Plan actuel, usage vs limites, upgrade → PayDunya
--- admin (middleware role=admin) ---
/admin               Stats globales (users, QR, scans, revenus)
/admin/users         Liste + recherche + actions : suspendre, changer de plan, supprimer
/admin/plans         CRUD des plans : prix, devise, toutes les limites (JSONB édité via formulaire)
/admin/payments      Historique PayDunya
/admin/qrcodes       Tous les QR de la plateforme
/admin/settings      Paramètres du site (site_settings)
--- API ---
/api/paydunya/ipn    Webhook IPN : vérification, activation abonnement, enregistrement paiement
```

## PayDunya (abstraction gateway)

- Interface `PaymentGateway` (`createCheckout`, `verifyPayment`, `handleWebhook`) dans `src/lib/payments/` ; `paydunya.ts` = première implémentation (Stripe ou autre = fichier de plus, plus tard).
- Flux : `/billing` → server action crée une facture checkout PayDunya (clés Master/Private/Public/Token en env, mode test) → redirection vers la page de paiement PayDunya → IPN sur `/api/paydunya/ipn` → vérification du token côté serveur → création/renouvellement `subscriptions` + ligne `payments` → retour utilisateur sur `/billing?status=success`.
- **Application des limites** : helper `checkPlanLimit(userId, action)` lu depuis `plans.limits` (JSONB) — appelé avant création de QR, upload de logo, choix de format d'export ; bannières d'upgrade quand une limite est atteinte.

## Personnalisation & exports

Panneau live preview dans le créateur/éditeur (`qr-code-styling`) : couleur QR, couleur de fond, styles de points (carré, arrondi, points, classy…), coins personnalisés, upload de logo (bucket `logos`, gated Pro). Design sauvegardé dans `qr_codes.design` (JSONB) → re-rendu identique partout. Téléchargements : **PNG** (haute résolution), **SVG** (natif), **PDF** (jsPDF), gated selon `plans.limits.formats`.

## Ordre d'implémentation

1. **Scaffold** : create-next-app (TS, Tailwind, App Router), next-intl (FR/EN), clients Supabase (`browser`/`server`/`admin`), layout de base, `.env.example`.
2. **Migrations SQL** : tout le schéma + RLS + triggers + seed plans, appliquées sur le projet Supabase de l'utilisateur (via chaîne de connexion fournie).
3. **Auth** : inscription, connexion, réinit mot de passe, profil ; middleware de protection ; création auto du profil + abonnement Free.
4. **Moteur QR** : registre des types, formulaires par type, personnalisation live, exports PNG/SVG/PDF, sauvegarde.
5. **Scan** : route `/q/[slug]`, pages publiques par type, tracking complet (géo, appareil), pages désactivé/expiré/mot de passe.
6. **Dashboard + stats** : KPIs, graphiques Recharts (charger le skill dataviz avant), page stats par QR.
7. **Gestion** : liste, recherche, filtres, dossiers, duplication, suppression, activer/désactiver.
8. **Monétisation** : plans + limites, `/billing`, intégration PayDunya complète (checkout + IPN, mode test).
9. **Admin complet** : les 6 pages admin ci-dessus.
10. **Finitions** : responsive mobile, animations framer-motion, traductions EN complètes, landing marketing.
11. **Déploiement** : `DEPLOY.md` — build standalone, PM2, config nginx (avec `X-Forwarded-For` pour l'IP réelle), HTTPS sur le sous-domaine, variables d'environnement.

## Informations à fournir par l'utilisateur (au début de l'implémentation)

- Supabase : URL du projet, clé `anon`, clé `service_role`, **chaîne de connexion DB** (Settings → Database) pour les migrations.
- PayDunya : Master Key, Private Key, Public Key, Token (**mode test**).
- Le sous-domaine exact (pour `NEXT_PUBLIC_APP_URL` et les URLs des QR).
- Email du compte admin (pour lui donner `role = 'admin'`).

## Vérification

- `npm run dev` en local avec les vraies clés Supabase : inscription → création d'un QR de chaque catégorie → vérifier la préview, les 3 exports, et l'édition dynamique.
- Tester `/q/[slug]` dans le navigateur (desktop + émulation mobile) : redirection, pages landing, mot de passe, expiration, désactivation ; vérifier qu'une ligne `qr_scans` correcte apparaît (pays/appareil/OS) et que les graphes se mettent à jour.
- PayDunya en mode test : upgrade Free → Pro de bout en bout, vérifier l'IPN, l'activation de l'abonnement et la levée des limites.
- Vérifier la RLS : un second compte ne voit pas les QR du premier ; un non-admin est rejeté de `/admin`.
- `npm run build` sans erreur (préparation VPS).
