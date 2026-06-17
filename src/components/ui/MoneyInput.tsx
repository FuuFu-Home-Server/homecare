"use client";

import { forwardRef } from "react";
import { Input } from "@/components/ui/Input";
import type { InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatThousands } from "@/lib/format";

export interface MoneyInputProps
  extends Omit<InputProps, "value" | "onChange" | "inputMode" | "leftAddon" | "type"> {
  /** Raw digit string with no separators, e.g. "1500000". */
  value: string;
  /** Receives the raw digit string (non-digits stripped). */
  onChange: (value: string) => void;
}

/** Rupiah field: shows grouped thousands ("1.500.000") while storing raw digits. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, className, ...rest },
  ref,
) {
  return (
    <Input
      ref={ref}
      leftAddon="Rp"
      inputMode="numeric"
      value={formatThousands(value)}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      className={cn("text-right tabular", className)}
      {...rest}
    />
  );
});
