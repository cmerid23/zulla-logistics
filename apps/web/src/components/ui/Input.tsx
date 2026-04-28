import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <label htmlFor={inputId} className="block">
      {label && <span className="mb-1 block text-sm font-medium text-ink-900">{label}</span>}
      <input
        id={inputId}
        ref={ref}
        className={cn(
          "w-full rounded-md border border-ink-100 bg-white px-3 py-2 text-sm transition",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
          error && "border-red-500 focus:border-red-500 focus:ring-red-100",
          className,
        )}
        {...rest}
      />
      {(error || hint) && (
        <span className={cn("mt-1 block text-xs", error ? "text-red-600" : "text-ink-600")}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
});
