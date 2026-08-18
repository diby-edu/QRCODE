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
      interpreter: "/root/.nvm/versions/node/v22.23.1/bin/node",
      // ⚠️ NE PAS passer en mode cluster (`instances: "max"` / `exec_mode:
      // "cluster"`) sans traiter d'abord les caches en mémoire.
      //
      // Trois Map vivent dans le tas de CE processus :
      //   src/proxy.ts                  domainCache  (TTL 5 min)
      //   src/lib/analytics/track-visit.ts  geoCache (TTL 1 h)
      //   src/lib/scan/track.ts             geoCache (TTL 1 h)
      //
      // En cluster, chaque instance démarre avec sa propre Map vide et les
      // requêtes sont réparties entre elles : avec 4 instances, une IP n'a
      // plus qu'une chance sur quatre de tomber sur le processus qui la
      // connaît. Les appels à ip-api.com (limite gratuite : 45/minute pour
      // tout le serveur) sont alors multipliés par le nombre d'instances, et
      // domainCache interroge la base d'autant plus — sur CHAQUE requête
      // arrivant par un domaine client.
      //
      // Le piège : rien ne casse. Aucune erreur, aucun log, le site répond
      // normalement. On ne s'en aperçoit que le jour où ip-api refuse les
      // appels et où les colonnes pays/ville se vident — en cherchant la
      // cause du mauvais côté.
      //
      // Si le cluster devient nécessaire : déplacer ces caches vers un
      // stockage partagé (Redis, ou une table Postgres), ou accepter la
      // dégradation en connaissance de cause.
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
