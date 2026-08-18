#!/usr/bin/env bash
# Miroir local des fichiers Supabase Storage (photos, vidéos, PDF, logos).
#
# Pourquoi ce script existe : pg_dump ne sauvegarde QUE Postgres. La table
# storage.objects n'y contient que des métadonnées (chemin, taille, type) —
# les octets des fichiers vivent dans un stockage objet séparé. Sans ce
# miroir, une restauration rendrait les comptes et les QR codes, mais chaque
# QR de type Entreprise, Vidéo ou PDF mènerait à une page aux images mortes.
#
# Incrémental par construction : l'application nomme les fichiers
# <user_id>/<uuid>.<ext> (voir src/app/api/upload/route.ts) et ne les modifie
# jamais — un remplacement crée un nouveau nom. Un fichier déjà téléchargé
# n'a donc jamais besoin de l'être à nouveau.
#
# Usage : ./scripts/backup-storage.sh [dossier_destination]
set -euo pipefail

DEST="${1:-/var/backups/qrhub/storage}"
ENV_FILE="${ENV_FILE:-/var/www/qrhub/.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  echo "✗ $ENV_FILE introuvable (surchargez avec ENV_FILE=...)" >&2
  exit 1
fi
set -a && . "$ENV_FILE" && set +a

: "${DATABASE_URL:?manquant dans $ENV_FILE}"
: "${NEXT_PUBLIC_SUPABASE_URL:?manquant dans $ENV_FILE}"

mkdir -p "$DEST"
chmod 700 "$DEST"

# -A -t : sortie brute, sans en-tête ni bordure — une ligne "bucket/chemin"
OBJECTS="$(psql "$DATABASE_URL" -A -t -c \
  "select bucket_id || '/' || name from storage.objects order by bucket_id, name")"

total=0; downloaded=0; skipped=0; failed=0
while IFS= read -r obj; do
  [ -z "$obj" ] && continue
  total=$((total + 1))
  target="$DEST/$obj"
  if [ -s "$target" ]; then
    skipped=$((skipped + 1))
    continue
  fi
  mkdir -p "$(dirname "$target")"
  # Les buckets sont publics : l'URL publique suffit, pas de jeton à exposer.
  if curl -fsS --max-time 120 -o "$target" \
       "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/object/public/$obj"; then
    downloaded=$((downloaded + 1))
  else
    # Fichier référencé en base mais absent du stockage : on ne laisse pas
    # un fichier vide derrière, qui serait ensuite considéré comme déjà copié.
    rm -f "$target"
    failed=$((failed + 1))
    echo "  ✗ échec : $obj" >&2
  fi
done <<< "$OBJECTS"

echo "objets en base : $total | téléchargés : $downloaded | déjà présents : $skipped | échecs : $failed"
[ "$failed" -eq 0 ]
