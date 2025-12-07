import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-md border bg-background px-3 py-2 text-foreground
            placeholder:text-foreground-muted
            focus:outline-none focus:ring-1
            disabled:cursor-not-allowed disabled:opacity-50
            ${error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-background-tertiary focus:border-accent focus:ring-accent'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-foreground-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-foreground-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full rounded-md border bg-background px-3 py-2 text-foreground
            placeholder:text-foreground-muted
            focus:outline-none focus:ring-1
            disabled:cursor-not-allowed disabled:opacity-50
            min-h-[100px] resize-y
            ${error
              ? 'border-error focus:border-error focus:ring-error'
              : 'border-background-tertiary focus:border-accent focus:ring-accent'
            }
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-foreground-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
