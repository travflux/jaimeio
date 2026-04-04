import { ArrowUp, ArrowDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDirection?: "up" | "down";
  period?: string;
  loading?: boolean;
}

export default function KpiCard({ label, value, delta, deltaDirection, period, loading }: KpiCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-5 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="h-8 w-24 bg-muted rounded mb-2" />
        <div className="h-3 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1 font-headline">{value}</p>
      <div className="flex items-center gap-2 mt-1.5">
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            deltaDirection === "up" ? "text-green-600 dark:text-green-400" : deltaDirection === "down" ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
          }`}>
            {deltaDirection === "up" && <ArrowUp className="w-3 h-3" />}
            {deltaDirection === "down" && <ArrowDown className="w-3 h-3" />}
            {delta}
          </span>
        )}
        {period && <span className="text-xs text-muted-foreground">{period}</span>}
      </div>
    </div>
  );
}
