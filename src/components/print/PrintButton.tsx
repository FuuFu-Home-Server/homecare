"use client";

import { Button } from "@/components/ui/Button";
import { IconPrint } from "@/components/layout/icons";

export interface PrintButtonProps {
  label?: string;
}

export function PrintButton({ label = "Cetak / Simpan PDF" }: PrintButtonProps) {
  return (
    <Button leftIcon={<IconPrint className="h-4 w-4" />} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
