import { HTMLAttributes, forwardRef } from "react";

type CardVariant = "low" | "default" | "high" | "highest" | "lowest";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  lowest: "bg-surface-container-lowest",
  low: "bg-surface-container-low",
  default: "bg-surface-container",
  high: "bg-surface-container-high",
  highest: "bg-surface-container-highest",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "low", hoverable = false, className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-xl p-6 ${variantClasses[variant]} ${hoverable ? "hover:bg-surface-container-high transition-all duration-200 cursor-pointer" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
export { Card };
export type { CardProps };
