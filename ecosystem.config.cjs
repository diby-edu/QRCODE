// Configuration PM2 — usage : pm2 start ecosystem.config.cjs
// VPS mutualisé : changez PORT ici si 3100 est déjà pris
// (vérifier avec : ss -tlnp | grep LISTEN  et  pm2 list).
module.exports = {
  apps: [
    {
      name: "qrhub",
      script: ".next/standalone/server.js",
      // Node 22 dédié à qrhub, installé via nvm à côté du Node système
      // (voir DEPLOY.md § Mise à jour Node 20 → 22) — les autres projets
      // PM2 du VPS restent sur leur propre version, non affectés.
      interpreter: "/root/.nvm/versions/node/v22.20.0/bin/node",
      env: {
        NODE_ENV: "production",
        // Port interne, servi uniquement à nginx — jamais exposé directement
        PORT: 3100,
        // Écoute limitée à localhost : l'app n'est joignable que via nginx
        HOSTNAME: "127.0.0.1",
      },
      // Redémarrage si fuite mémoire éventuelle
      max_memory_restart: "500M",
    },
  ],
};
