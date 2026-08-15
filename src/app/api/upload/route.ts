import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUpload } from "@/app/(app)/qr/actions";
import { appUrl } from "@/lib/url";

const ALLOWED_BUCKETS = ["uploads", "logos"] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

function isAllowedBucket(value: unknown): value is Bucket {
  return typeof value === "string" && (ALLOWED_BUCKETS as readonly string[]).includes(value);
}

/**
 * Types réellement acceptés par les formulaires (voir `accept` dans
 * src/lib/qr-types/registry.ts et QRCustomizer) → extension imposée.
 *
 * Deux raisons d'avoir cette table plutôt que de faire confiance au fichier
 * envoyé :
 *
 * 1. Les buckets sont PUBLICS et l'écriture se fait en service_role. Sans
 *    filtre, n'importe quel compte gratuit pouvait y déposer une page HTML
 *    de hameçonnage ou un exécutable, avec une URL publique permanente —
 *    notre infrastructure servant alors de plateforme d'hébergement à du
 *    contenu malveillant (signalements, mise en liste noire du domaine,
 *    suspension du projet Supabase).
 * 2. L'extension était reprise du nom de fichier fourni par le client, et le
 *    Content-Type stocké venait de `file.type`, lui aussi fourni par le
 *    client. Or c'est précisément ce Content-Type que Supabase renvoie
 *    ensuite au navigateur. On le fige donc à partir de cette table : même
 *    si le corps du fichier contient du HTML, il sera servi en `image/png`
 *    et restera inerte.
 *
 * SVG volontairement absent : `image/svg+xml` peut embarquer du <script>, et
 * un SVG servi en ligne depuis un bucket public est un XSS stocké. Les logos
 * doivent être en PNG/JPEG/WebP.
 */
const ALLOWED_TYPES: Record<string, { ext: string; maxMb: number }> = {
  "image/png": { ext: "png", maxMb: 10 },
  "image/jpeg": { ext: "jpg", maxMb: 10 },
  "image/webp": { ext: "webp", maxMb: 10 },
  "image/gif": { ext: "gif", maxMb: 10 },
  "image/avif": { ext: "avif", maxMb: 10 },
  "application/pdf": { ext: "pdf", maxMb: 10 },
  "audio/mpeg": { ext: "mp3", maxMb: 15 },
  "audio/mp4": { ext: "m4a", maxMb: 15 },
  "audio/ogg": { ext: "ogg", maxMb: 15 },
  "audio/wav": { ext: "wav", maxMb: 15 },
  "audio/x-wav": { ext: "wav", maxMb: 15 },
  "video/mp4": { ext: "mp4", maxMb: 25 },
  "video/webm": { ext: "webm", maxMb: 25 },
  "video/quicktime": { ext: "mov", maxMb: 25 },
};

export async function POST(request: Request) {
  // Origin doit correspondre à l'app : cette route mute des données au nom
  // de l'utilisateur authentifié, les Server Actions ont cette protection
  // intégrée mais pas les Route Handlers.
  const origin = request.headers.get("origin");
  if (origin && origin !== appUrl()) {
    return NextResponse.json({ error: "generic" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    // Corps tronqué (au-delà de experimental.proxyClientMaxBodySize dans
    // next.config.ts) ou multipart malformé : rejet propre plutôt qu'un
    // crash non géré.
    return NextResponse.json({ error: "generic" }, { status: 413 });
  }
  const bucket = formData.get("bucket");
  const file = formData.get("file");
  if (!isAllowedBucket(bucket) || !(file instanceof File)) {
    return NextResponse.json({ error: "generic" }, { status: 400 });
  }

  // Type déclaré : doit figurer dans la liste blanche, sinon rejet immédiat.
  const allowed = ALLOWED_TYPES[file.type.toLowerCase()];
  if (!allowed) {
    return NextResponse.json({ error: "fileType" }, { status: 415 });
  }

  // file.size reflète les octets réellement reçus par le parseur multipart
  // une fois formData() résolu — un Content-Length falsifié n'y change rien,
  // contrairement à une vérification basée sur le header. nginx applique en
  // plus un plafond dur (client_max_body_size, voir DEPLOY.md).
  if (file.size > allowed.maxMb * 1024 * 1024) {
    return NextResponse.json(
      { error: "fileTooLarge", limitMb: allowed.maxMb },
      { status: 413 }
    );
  }

  const hasVideo = file.type.startsWith("video/");
  const check = await checkUpload(file.size, hasVideo);
  if (!check.ok) {
    const status = check.error === "auth" ? 401 : check.error === "video" ? 403 : 413;
    return NextResponse.json(
      check.error === "storage"
        ? { error: check.error, limitMb: check.limitMb }
        : { error: check.error },
      { status }
    );
  }

  // Extension ET Content-Type dérivés de la liste blanche, jamais du nom de
  // fichier ni de ce que le client déclare librement.
  const path = `${user.id}/${crypto.randomUUID()}.${allowed.ext}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type.toLowerCase() });
  if (uploadError) {
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
