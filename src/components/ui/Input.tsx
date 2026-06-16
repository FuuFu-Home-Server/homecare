import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const FIELD_BASE =
  "w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <input
        ref={ref}
        id={fieldId}
        className={cn(FIELD_BASE, "h-10", error ? "border-red-400" : "border-slate-300", className)}
        {...rest}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <select
        ref={ref}
        id={fieldId}
        className={cn(FIELD_BASE, "h-10", error ? "border-red-400" : "border-slate-300", className)}
        {...rest}
      >
        {children}
      </select>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label ? <Label htmlFor={fieldId}>{label}</Label> : null}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(FIELD_BASE, "py-2", error ? "border-red-400" : "border-slate-300", className)}
        {...rest}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
});

export interface LabelProps {
  htmlFor?: string;
  children: ReactNode;
}

export function Label({ htmlFor, children }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-600">
      {children}
    </label>
  );
}

function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  if (error) return <p className="mt-1 text-xs text-red-600">{error}</p>;
  if (hint) return <p className="mt-1 text-xs text-slate-400">{hint}</p>;
  return null;
}
