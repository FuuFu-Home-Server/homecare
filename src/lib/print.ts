/**
 * Print/PDF helpers. On desktop these go through the Electron print pipeline
 * (window.homedoc); on the web they fall back to the browser print dialog, which
 * also offers "Save as PDF".
 */

export async function printDocument(): Promise<void> {
  if (typeof window !== "undefined" && window.homedoc) {
    await window.homedoc.print();
    return;
  }
  if (typeof window !== "undefined") window.print();
}

export async function saveDocumentPdf(filename: string): Promise<boolean> {
  if (typeof window !== "undefined" && window.homedoc) {
    return window.homedoc.printToPdf(filename);
  }
  if (typeof window !== "undefined") window.print();
  return false;
}

export function hasPrintBridge(): boolean {
  return typeof window !== "undefined" && Boolean(window.homedoc);
}
