"use client";

import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";
import type { QrDesign } from "@/lib/types";
import { buildQrOptions } from "./qr-options";

export function QRPreview({
  value,
  design,
  size = 256,
  className = "",
}: {
  value: string;
  design: QrDesign;
  size?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStylingCtor } = await import("qr-code-styling");
      if (cancelled || !containerRef.current) return;
      const options = buildQrOptions(value, design, size);
      if (!qrRef.current) {
        qrRef.current = new QRCodeStylingCtor(options);
        containerRef.current.innerHTML = "";
        qrRef.current.append(containerRef.current);
      } else {
        qrRef.current.update(options);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, design, size]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
