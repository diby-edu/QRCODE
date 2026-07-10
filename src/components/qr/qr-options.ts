import type { Options } from "qr-code-styling";
import type { QrDesign } from "@/lib/types";

export const DEFAULT_DESIGN: QrDesign = {
  fgColor: "#0f172a",
  bgColor: "#ffffff",
  dotStyle: "square",
  cornerStyle: "square",
  logoUrl: null,
};

export function buildQrOptions(
  value: string,
  design: QrDesign,
  size = 256,
  type: "svg" | "canvas" = "svg"
): Partial<Options> {
  return {
    width: size,
    height: size,
    type,
    data: value || " ",
    margin: Math.round(size / 32),
    image: design.logoUrl ?? undefined,
    qrOptions: {
      errorCorrectionLevel: design.logoUrl ? "H" : "M",
    },
    dotsOptions: {
      color: design.fgColor,
      type: design.dotStyle,
    },
    cornersSquareOptions: {
      color: design.fgColor,
      type: design.cornerStyle,
    },
    cornersDotOptions: {
      color: design.fgColor,
    },
    backgroundOptions: {
      color: design.bgColor,
    },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: Math.round(size / 64),
      imageSize: 0.35,
    },
  };
}
