"use client";

import type { QrDesign } from "@/lib/types";
import { buildQrOptions } from "@/components/qr/qr-options";

export type DownloadFormat = "png" | "svg" | "pdf";

function sanitize(name: string) {
  return name.replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/-+/g, "-") || "qr-code";
}

export async function downloadQr(
  value: string,
  design: QrDesign,
  format: DownloadFormat,
  title: string
) {
  const { default: QRCodeStyling } = await import("qr-code-styling");
  const name = sanitize(title);

  if (format === "svg") {
    const qr = new QRCodeStyling(buildQrOptions(value, design, 1024, "svg"));
    await qr.download({ name, extension: "svg" });
    return;
  }

  const qr = new QRCodeStyling(buildQrOptions(value, design, 1024, "canvas"));

  if (format === "png") {
    await qr.download({ name, extension: "png" });
    return;
  }

  // PDF : QR centré sur une page A4 avec le titre
  const blob = (await qr.getRawData("png")) as Blob | null;
  if (!blob) return;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  pdf.setFontSize(18);
  pdf.text(title, pageWidth / 2, 40, { align: "center" });
  const qrSize = 110;
  pdf.addImage(dataUrl, "PNG", (pageWidth - qrSize) / 2, 60, qrSize, qrSize);
  pdf.save(`${name}.pdf`);
}
