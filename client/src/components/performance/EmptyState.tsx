import { Button } from "@/components/ui/button";
import { BarChart2 } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({ title, description, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <BarChart2 className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {ctaLabel && onCta && (
        <Button onClick={onCta} size="sm">{ctaLabel}</Button>
      )}
    </div>
  );
}
