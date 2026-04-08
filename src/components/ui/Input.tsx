import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">{icon}</span>
        )}
        <input
          ref={ref}
          className={`w-full bg-surface-container-lowest border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 px-4 py-2.5 text-sm font-body transition-colors duration-200 ${icon ? "pl-10" : ""} ${className}`}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
export { Input };
