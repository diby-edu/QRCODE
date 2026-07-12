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

  // file.size reflète les octets réellement reçus par le parseur multipart
  // une fois formData() résolu — un Content-Length falsifié n'y change rien,
  // contrairement à une vérification basée sur le header. nginx applique en
  // plus un plafond dur (client_max_body_size, voir DEPLOY.md).
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

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from(bucket).upload(path, file);
  if (uploadError) {
    return NextResponse.json({ error: "generic" }, { status: 500 });
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
