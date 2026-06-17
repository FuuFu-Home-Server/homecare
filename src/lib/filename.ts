/**
 * Distinct, filesystem-safe download names. Every export (PDF, CSV, Excel)
 * builds its name from human parts so two files never collide on a generic
 * "struk.pdf" / "laporan.csv".
 *
 * fileSlug("Transaksi", "2026-06") → "transaksi-2026-06"
 * pdfFileName("struk", "00006", "Afifah Laila") → "struk-00006-afifah-laila.pdf"
 */
export function fileSlug(...parts: Array<string | number>): string {
  const slug = parts
    .map((p) =>
      String(p)
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .join("-");
  return slug || "dokumen";
}

export function pdfFileName(...parts: Array<string | number>): string {
  return `${fileSlug(...parts)}.pdf`;
}
