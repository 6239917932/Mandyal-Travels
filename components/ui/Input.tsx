'use client';

import { forwardRef, useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', error, id, label, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `input-${generatedId.replaceAll(':', '')}`;

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={inputId}>
        {label}
      </label>

      <input
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className={`ui-input ${error ? 'ui-input--error' : ''} ${className}`.trim()}
        id={inputId}
        ref={ref}
        {...props}
      />

      {error ? (
        <p className="ui-field__error" id={`${inputId}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
