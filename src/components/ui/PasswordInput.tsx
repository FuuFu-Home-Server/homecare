"use client";

import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import type { InputProps } from "@/components/ui/Input";
import { PasswordMeter } from "@/components/ui/PasswordMeter";

export interface PasswordInputProps extends Omit<InputProps, "type" | "rightAddon"> {
  /** Show the four-segment strength meter below (use for new passwords). */
  meter?: boolean;
}

/** Password field with a show/hide toggle and an optional strength meter. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { meter, value, ...rest },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full">
      <Input
        ref={ref}
        type={show ? "text" : "password"}
        value={value}
        rightAddon={
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        }
        {...rest}
      />
      {meter ? <PasswordMeter value={typeof value === "string" ? value : ""} /> : null}
    </div>
  );
});

function Eye() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 2 12s3.5 7 10 7a9.1 9.1 0 0 0 4.39-1.11" />
      <path d="m1 1 22 22M9.88 9.88a3 3 0 0 0 4.24 4.24" />
    </svg>
  );
}
