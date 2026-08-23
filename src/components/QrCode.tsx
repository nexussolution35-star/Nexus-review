import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** Real scannable QR for a staff review link, rendered with the qrcode library. */
export function QrCanvas({ value, size = 96 }: { value: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) {
      QRCode.toCanvas(ref.current, value, {
        width: size,
        margin: 1,
        color: { dark: "#0A2540", light: "#FFFFFF" },
      });
    }
  }, [value, size]);
  return (
    <canvas
      ref={ref}
      className="rounded-md border border-line bg-white shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export async function downloadQrPng(value: string, filename: string): Promise<void> {
  const url = await QRCode.toDataURL(value, {
    width: 512,
    margin: 2,
    color: { dark: "#0A2540", light: "#FFFFFF" },
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export function staffReviewLink(qrSlug: string): string {
  // import.meta.env.BASE_URL ends with "/" ("/" locally, "/Nexus-review/" on Pages).
  return `${window.location.origin}${import.meta.env.BASE_URL}r/${qrSlug}`;
}
