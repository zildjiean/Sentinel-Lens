"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "security" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-[#263046] hover:opacity-90 active:scale-[0.97]",
  secondary: "border border-outline-variant/20 text-primary hover:bg-surface-container-high active:scale-[0.97]",
  security: "bg-secondary-container text-white hover:opacity-90 shadow-[0_4px_12px_rgba(74,225,131,0.2)] active:scale-[0.97]",
  ghost: "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high active:opacity-90",
  danger: "bg-error-container text-error hover:opacity-90 active:scale-[0.97]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs min-h-[36px]",
  md: "px-4 py-2 text-sm min-h-[40px]",
  lg: "px-6 py-3 text-sm min-h-[44px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
export type { ButtonProps, ButtonVariant };
