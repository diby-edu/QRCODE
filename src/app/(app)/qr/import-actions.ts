"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CsvImportRow {
  title: string;
  url: string;
  folder?: string;
  is_dynamic?: boolean;
}

export interface CsvImportResult {
  imported: number;
  skipped: { row: number; reason: string }[];
  error?: string;
}

/** Import en masse de QR "Site web" (seul type au périmètre CSV pour l'instant :
 * un seul champ requis, contrairement aux types avec fichiers ou listes). */
export async function importWebsiteQrCodesFromCsv(
  rows: CsvImportRow[]
): Promise<CsvImportResult> {
  if (rows.length === 0) return { imported: 0, skipped: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: [], error: "generic" };

  const { data, error } = await supabase.rpc("import_qr_codes_website", {
    p_rows: rows,
  });
  if (error) {
    const message = error.message ?? "generic";
    const known = message.startsWith("qrLimit:") || message.startsWith("dynamicLimit:");
    return { imported: 0, skipped: [], error: known ? message : "generic" };
  }

  revalidatePath("/qr");
  revalidatePath("/dashboard");
  return data as CsvImportResult;
}
