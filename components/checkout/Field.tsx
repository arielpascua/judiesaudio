import type { InputHTMLAttributes } from 'react';

// Squared, hairline-ruled control on white. The edge uses muted ink (not the
// decorative `line` hairline) so it reaches 3:1 against the chalk page; focus
// uses the global :focus-visible outline and is never removed.
export const fieldClass = 'mt-1 min-h-[44px] w-full border border-ink-muted bg-white px-3 text-sm';
export const labelClass = 'block text-sm font-medium';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** Rendered after the label, e.g. "(optional)". */
  optional?: boolean;
  hint?: string;
}

/** A labelled text input. The label is always visible and tied to the control. */
export function Field({ id, label, optional, hint, ...input }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      <input id={id} name={id} aria-describedby={hintId} required={!optional} className={fieldClass} {...input} />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
