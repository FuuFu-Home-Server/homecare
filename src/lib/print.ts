/**
 * Print/PDF helpers. On desktop these go through the Electron print pipeline
 * (window.homecare); on the web they fall back to the browser print dialog, which
 * also offers "Save as PDF".
 */

export async function printDocument(): Promise<void> {
  if (typeof window !== "undefined" && window.homecare) {
    await window.homecare.print();
    return;
  }
  if (typeof window !== "undefined") window.print();
}

export async function saveDocumentPdf(filename: string): Promise<boolean> {
  if (typeof window !== "undefined" && window.homecare) {
    return window.homecare.printToPdf(filename);
  }
  if (typeof window !== "undefined") window.print();
  return false;
}

export function hasPrintBridge(): boolean {
  return typeof window !== "undefined" && Boolean(window.homecare);
}
