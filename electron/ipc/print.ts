import { BrowserWindow, dialog, ipcMain, type WebContents } from "electron";
import fs from "node:fs";

/**
 * Print pipeline for the renderer. `print:now` opens the OS print dialog when a
 * printer exists, but falls back to a Save-as-PDF dialog when none is installed
 * (so a printer-less clinic PC never dead-ends). `print:pdf` always renders to a
 * PDF file. The struk page carries its own @media print layout + SIPP, so
 * margins are dropped to let the 80mm receipt sheet drive the page.
 */
async function savePdf(sender: WebContents, filename: string): Promise<boolean> {
  const data = await sender.printToPDF({
    printBackground: true,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  const win = BrowserWindow.fromWebContents(sender);
  const options = {
    defaultPath: filename,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  };
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return false;
  await fs.promises.writeFile(result.filePath, data);
  return true;
}

export function registerPrintIpc(): void {
  ipcMain.handle("print:now", async (event) => {
    const printers = await event.sender.getPrintersAsync();
    if (printers.length === 0) {
      // No printer on this machine → go straight to Save-as-PDF.
      await savePdf(event.sender, "cetak.pdf");
      return;
    }
    await new Promise<void>((resolve) => {
      event.sender.print({ margins: { marginType: "none" } }, () => resolve());
    });
  });

  ipcMain.handle("print:pdf", (event, filename: string): Promise<boolean> => {
    return savePdf(event.sender, filename);
  });
}
