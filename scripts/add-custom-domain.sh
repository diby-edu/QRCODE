#!/usr/bin/env bash
# Active un domaine personnalisé client sur le VPS (nginx + certbot).
# Usage : ./scripts/add-custom-domain.sh go.exemple.com
#
# Lancé À LA MAIN par l'admin en SSH, jamais par l'app elle-même — ce
# geste demande les droits root sur un VPS mutualisé (autres projets
# hébergés), voir la discussion dans le plan / DEPLOY.md § Domaine
# personnalisé. Une fois ce script terminé avec succès, aller basculer la
# demande en "Actif" dans /admin/domains (l'app n'a pas besoin de savoir
# comment nginx/certbot fonctionnent, et ce script n'a pas besoin des
# credentials Supabase).
set -euo pipefail

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domaine>" >&2
  exit 1
fi

PORT=3100 # doit correspondre à PORT dans ecosystem.config.cjs
CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@numerik360.com}" # ajustez ou exportez avant l'appel

echo "→ Vérification DNS de $DOMAIN..."
RESOLVED="$(dig +short "$DOMAIN" | tail -n1)"
if [ -z "$RESOLVED" ]; then
  echo "✗ $DOMAIN ne résout à rien pour l'instant. Le client a-t-il bien"
  echo "  ajouté le CNAME chez son fournisseur de domaine ? La propagation"
  echo "  DNS peut prendre jusqu'à quelques heures — réessayez plus tard."
  exit 1
fi
echo "✓ $DOMAIN résout vers : $RESOLVED"

SITE_FILE="/etc/nginx/sites-available/qrhub-$DOMAIN"
echo "→ Écriture de $SITE_FILE..."
cat > "$SITE_FILE" <<NGINX
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        client_max_body_size 25m;
    }
}
NGINX

ln -sf "$SITE_FILE" "/etc/nginx/sites-enabled/qrhub-$DOMAIN"

echo "→ Test de la config nginx..."
nginx -t

echo "→ Rechargement nginx..."
systemctl reload nginx

echo "→ Certificat SSL (certbot)..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect -m "$CERTBOT_EMAIL" || {
  echo "✗ certbot a échoué. Le bloc nginx HTTP reste actif, mais sans SSL."
  echo "  Vérifiez que le port 80 est bien accessible publiquement pour ce"
  echo "  domaine avant de réessayer : certbot --nginx -d $DOMAIN"
  exit 1
}

echo ""
echo "✓ $DOMAIN est configuré et actif."
echo "→ Dernière étape : basculez la demande en \"Actif\" dans /admin/domains."
