// Webhook IPN PayDunya : notification serveur→serveur après paiement.
// Corps form-urlencoded avec champs imbriqués data[...]. Le hash
// (SHA-512 de la master key) authentifie l'émetteur ; le statut est
// ensuite re-vérifié auprès de l'API avant toute activation.

import { NextResponse, type NextRequest } from "next/server";
import { verifyIpnHash } from "@/lib/payments/paydunya";
import { verifyAndActivate } from "@/lib/payments/activate";

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v : null;
  };

  const hash = field("data[hash]") ?? field("hash");
  if (!(await verifyIpnHash(hash))) {
    return NextResponse.json({ error: "invalid hash" }, { status: 403 });
  }

  const token =
    field("data[invoice][token]") ?? field("data[token]") ?? field("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  try {
    const result = await verifyAndActivate(token);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("PayDunya IPN error:", err);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
