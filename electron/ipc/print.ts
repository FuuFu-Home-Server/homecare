import { BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs";

/**
 * Print pipeline for the renderer. `print:now` opens the OS print dialog (the
 * user picks a physical printer or "Save as PDF"); `print:pdf` renders straight
 * to a PDF file. The struk page carries its own @media print layout + SIPP, so
 * margins are dropped to let the 80mm receipt sheet drive the page.
 */
export function registerPrintIpc(): void {
  ipcMain.handle("print:now", (event) => {
    return new Promise<void>((resolve) => {
      event.sender.print({ margins: { marginType: "none" } }, () => resolve());
    });
  });

  ipcMain.handle("print:pdf", async (event, filename: string): Promise<boolean> => {
    const data = await event.sender.printToPDF({
      printBackground: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await (win
      ? dialog.showSaveDialog(win, {
          defaultPath: filename,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        })
      : dialog.showSaveDialog({
          defaultPath: filename,
          filters: [{ name: "PDF", extensions: ["pdf"] }],
        }));
    if (result.canceled || !result.filePath) return false;
    await fs.promises.writeFile(result.filePath, data);
    return true;
  });
}
