#!/usr/bin/env bash
# Déploiement de QRHub sur le VPS. À lancer depuis /var/www/qrhub en SSH.
#
# Remplace les huit commandes manuelles de DEPLOY.md § 12, et surtout les
# trois pièges qui se répètent à chaque déploiement :
#
#   1. `git pull` échoue systématiquement sur package-lock.json modifié
#      localement — npm ne résout pas les mêmes dépendances optionnelles sous
#      Linux et sous Windows. C'est un fichier généré : on le réaligne.
#   2. Le `node` par défaut du VPS est en v20 alors que package.json exige
#      >= 22. Sans le bon PATH, le build se fait avec la mauvaise version.
#   3. Le chemin de Node était écrit en dur dans DEPLOY.md et a fini périmé
#      (v22.20.0 alors que la machine a v22.23.1). Ici on le lit dans
#      ecosystem.config.cjs, qui est déjà la source de vérité pour PM2 : les
#      deux ne peuvent plus diverger.
#
# Et il rend impossible l'oubli le plus coûteux : `cp .env.local` dans le
# build standalone. Sans ce fichier, l'application démarre SANS erreur puis
# échoue silencieusement sur les paiements et les uploads.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/qrhub}"
PM2_NAME="${PM2_NAME:-qrhub}"

cd "$APP_DIR"

echo "→ [1/7] Node"
NODE_BIN="$(grep -oE '/[^"]*/bin/node' ecosystem.config.cjs | head -1)"
if [ -z "$NODE_BIN" ] || [ ! -x "$NODE_BIN" ]; then
  echo "✗ Interpréteur Node introuvable : '$NODE_BIN'" >&2
  echo "  Le chemin vient de ecosystem.config.cjs. Versions disponibles :" >&2
  ls /root/.nvm/versions/node/ 2>/dev/null | sed 's/^/    /' >&2
  echo "  Corrigez ecosystem.config.cjs, puis relancez." >&2
  exit 1
fi
export PATH="$(dirname "$NODE_BIN"):$PATH"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "✗ Node $(node -v) — le projet exige >= 22 (voir engines dans package.json)" >&2
  exit 1
fi
echo "  $(node -v) — $NODE_BIN"

echo "→ [2/7] Récupération du code"
# Fichier généré : sa divergence locale est attendue, pas une modification à préserver.
git checkout -- package-lock.json 2>/dev/null || true
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "✗ Modifications locales non commitées (hors package-lock.json) :" >&2
  git status --short >&2
  echo "  Traitez-les avant de déployer." >&2
  exit 1
fi
git pull --ff-only
echo "  $(git log --oneline -1)"

echo "→ [3/7] Dépendances"
npm install --no-audit --no-fund

echo "→ [4/7] Migrations"
npm run db:migrate

echo "→ [5/7] Build"
npm run build

echo "→ [6/7] Assets et variables d'environnement"
# Le build régénère entièrement .next/standalone : ces trois copies sont
# obligatoires APRÈS chaque build, jamais avant.
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
cp .env.local .next/standalone/
VARS="$(grep -cE '^[A-Z_]+=' .next/standalone/.env.local || echo 0)"
if [ "$VARS" -lt 5 ]; then
  echo "✗ .next/standalone/.env.local ne contient que $VARS variables — copie douteuse." >&2
  exit 1
fi
echo "  $VARS variables en place"

echo "→ [7/7] Redémarrage"
pm2 restart "$PM2_NAME" --update-env >/dev/null
sleep 4

# Contrôle de vie : sans ça, un déploiement cassé passerait pour un succès.
PORT="$(grep -oE 'PORT: *"?[0-9]+' ecosystem.config.cjs | grep -oE '[0-9]+' | head -1)"
PORT="${PORT:-3100}"
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:$PORT/api/health" || echo 000)"
if [ "$CODE" != "200" ]; then
  echo "✗ /api/health répond $CODE — l'application ne démarre pas correctement." >&2
  echo "  Journaux : pm2 logs $PM2_NAME --lines 40" >&2
  exit 1
fi

echo ""
echo "✓ Déployé — $(git log --oneline -1)"
pm2 describe "$PM2_NAME" | grep -E "status|uptime" | head -2
