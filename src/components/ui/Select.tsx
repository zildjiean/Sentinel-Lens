import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  icon?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, icon, className = "", ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">{icon}</span>
        )}
        <select
          ref={ref}
          className={`w-full bg-surface-container-lowest appearance-none border-b-2 border-outline-variant/30 focus:border-primary focus:outline-none text-on-surface text-sm font-body px-4 py-2.5 pr-10 transition-colors duration-200 ${icon ? "pl-10" : ""} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none">expand_more</span>
      </div>
    );
  }
);
Select.displayName = "Select";
export { Select };
