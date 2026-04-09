import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-on-surface-variant" />
      </div>
      <h3 className="font-headline text-base font-semibold text-on-surface mb-1">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
