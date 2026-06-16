import ExcelJS from "exceljs";
import type { Worksheet } from "exceljs";

/** Write a one- or two-row (grouped) header and merge group/standalone cells. */
function buildHeader(ws: Worksheet, columns: XlsxColumn[], grouped: boolean): void {
  if (!grouped) {
    columns.forEach((c, i) => {
      ws.getRow(1).getCell(i + 1).value = c.header;
    });
    return;
  }

  let i = 0;
  while (i < columns.length) {
    const col = columns[i];
    if (!col) break;
    const startCol = i + 1;
    if (col.group) {
      let end = i;
      while (end + 1 < columns.length && columns[end + 1]?.group === col.group) end++;
      const endCol = end + 1;
      ws.mergeCells(1, startCol, 1, endCol);
      ws.getRow(1).getCell(startCol).value = col.group;
      for (let c = i; c <= end; c++) {
        ws.getRow(2).getCell(c + 1).value = columns[c]?.header ?? "";
      }
      i = end + 1;
    } else {
      ws.mergeCells(1, startCol, 2, startCol);
      ws.getRow(1).getCell(startCol).value = col.header;
      i += 1;
    }
  }
}

export interface XlsxColumn {
  header: string;
  key: string;
  width?: number;
  /** Wrap long text (e.g. the detail column). */
  wrap?: boolean;
  /** Optional parent header. Consecutive columns sharing a group are merged
   *  under one top header, with each `header` as a sub-column below it. */
  group?: string;
}

/** Build an .xlsx workbook from rows and trigger a browser download. */
export async function downloadXlsx(
  filename: string,
  sheetName: string,
  columns: XlsxColumn[],
  rows: ReadonlyArray<Record<string, string | number>>,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ key: c.key, width: c.width ?? 18 }));

  const grouped = columns.some((c) => c.group);
  const headerRows = grouped ? 2 : 1;
  buildHeader(ws, columns, grouped);

  for (let r = 1; r <= headerRows; r++) {
    ws.getRow(r).font = { bold: true };
    ws.getRow(r).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  }
  ws.views = [{ state: "frozen", ySplit: headerRows }];

  for (const row of rows) ws.addRow(row);

  const wrapKeys = columns.filter((c) => c.wrap).map((c) => c.key);
  if (wrapKeys.length) {
    ws.eachRow((row, i) => {
      if (i <= headerRows) return;
      for (const key of wrapKeys) {
        row.getCell(key).alignment = { wrapText: true, vertical: "top" };
      }
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
