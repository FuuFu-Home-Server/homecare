"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/layout/icons";
import { hasPrintBridge, printDocument, saveDocumentPdf } from "@/lib/print";

export interface PrintButtonProps {
  label?: string;
  /** When set on desktop, also offer a "Simpan PDF" button writing this file. */
  pdfName?: string;
}

export function PrintButton({ label = "Cetak / Simpan PDF", pdfName }: PrintButtonProps) {
  const [bridge, setBridge] = useState(false);
  useEffect(() => setBridge(hasPrintBridge()), []);

  return (
    <div className="flex gap-2">
      <Button leftIcon={<IconPrint className="h-4 w-4" />} onClick={() => void printDocument()}>
        {label}
      </Button>
      {bridge && pdfName ? (
        <Button variant="secondary" onClick={() => void saveDocumentPdf(pdfName)}>
          Simpan PDF
        </Button>
      ) : null}
    </div>
  );
}
