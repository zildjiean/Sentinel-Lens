import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    return (
      <div className="relative">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-on-surface-variant mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-surface-container-lowest border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 text-on-surface placeholder:text-on-surface-variant/50 px-4 py-2.5 text-sm font-body transition-colors duration-200 ${icon ? "pl-10" : ""} ${error ? "border-error focus:border-error" : ""} ${className}`}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-error mt-1" role="alert">{error}</p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-on-surface-variant/70 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
export { Input };
