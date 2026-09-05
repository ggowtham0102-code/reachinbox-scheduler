import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapProps {
  label: string;
  hint?: string;
}

export function Input({
  label,
  hint,
  className = "",
  ...rest
}: FieldWrapProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-mist-400">{label}</span>
      <input
        className={`rounded-sm border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-400/60 focus:border-signal ${className}`}
        {...rest}
      />
      {hint && <span className="text-xs text-mist-400">{hint}</span>}
    </label>
  );
}

export function Textarea({
  label,
  hint,
  className = "",
  ...rest
}: FieldWrapProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-mist-400">{label}</span>
      <textarea
        className={`rounded-sm border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-mist-50 placeholder:text-mist-400/60 focus:border-signal ${className}`}
        {...rest}
      />
      {hint && <span className="text-xs text-mist-400">{hint}</span>}
    </label>
  );
}
