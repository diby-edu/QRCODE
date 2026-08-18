import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Charge l'environnement des tests e2e et REFUSE de tourner contre la
 * production.
 *
 * Pourquoi ce garde-fou existe : les tests créent de vrais comptes avec la
 * clé service_role, dont un compte `role = 'admin'` — et le mot de passe de
 * ces comptes est en clair dans ce dépôt, qui est public. Tant que le
 * teardown s'exécute, tout est nettoyé. Mais une interruption (Ctrl+C, test
 * qui bloque et se fait tuer, coupure) laisserait un administrateur actif en
 * production avec des identifiants publiés sur GitHub.
 *
 * Se reposer sur « le nettoyage passera toujours » n'est pas une garantie.
 * Ici, l'erreur devient impossible par construction : les tests lisent
 * `.env.test`, et si ce fichier pointe vers le même projet Supabase que
 * `.env.local`, ils s'arrêtent avant d'avoir écrit quoi que ce soit.
 */

function parseEnvFile(path: string): Record<string, string> {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
      })
  );
}

export function loadTestEnv(): void {
  const root = process.cwd();
  const testEnvPath = join(root, ".env.test");
  const localEnvPath = join(root, ".env.local");

  if (!existsSync(testEnvPath)) {
    throw new Error(
      [
        "",
        "  Fichier .env.test introuvable — les tests e2e ne peuvent pas démarrer.",
        "",
        "  Ils créent de vrais comptes (dont un administrateur) avec la clé",
        "  service_role : ils exigent un projet Supabase DÉDIÉ, jamais celui de",
        "  production. Le plan gratuit Supabase autorise deux projets.",
        "",
        "  1. Créer un second projet sur supabase.com",
        "  2. Y appliquer le schéma :",
        "       DATABASE_URL=<url_du_projet_de_test> npm run db:migrate",
        "  3. Créer .env.test avec NEXT_PUBLIC_SUPABASE_URL,",
        "     NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY",
        "     de CE projet (.env.test est ignoré par git).",
        "",
      ].join("\n")
    );
  }

  const testEnv = parseEnvFile(testEnvPath);
  const testUrl = testEnv.NEXT_PUBLIC_SUPABASE_URL;
  if (!testUrl || !testEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      ".env.test doit définir NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  // Le contrôle qui compte : si le projet de test est le projet applicatif,
  // on s'arrête. Comparaison sur l'URL, qui identifie le projet Supabase.
  if (existsSync(localEnvPath)) {
    const localUrl = parseEnvFile(localEnvPath).NEXT_PUBLIC_SUPABASE_URL;
    if (localUrl && localUrl === testUrl) {
      throw new Error(
        [
          "",
          "  ARRÊT : .env.test pointe vers le MÊME projet Supabase que .env.local.",
          "",
          "  Les tests créeraient de vrais comptes administrateurs dans ta base de",
          "  production, avec un mot de passe publié dans ce dépôt public.",
          "",
          "  Fais pointer .env.test vers un second projet Supabase dédié.",
          "",
        ].join("\n")
      );
    }
  }

  // Écrasement explicite : les variables du shell ne doivent pas pouvoir
  // rediriger les tests vers un autre projet à l'insu de ce contrôle.
  for (const [key, value] of Object.entries(testEnv)) {
    process.env[key] = value;
  }
}
