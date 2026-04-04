import { Loader2 } from "lucide-react";

interface ChartWrapperProps {
  title: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
}

export default function ChartWrapper({ title, children, loading, error }: ChartWrapperProps) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-64 text-sm text-destructive">{error}</div>
      ) : (
        children
      )}
    </div>
  );
}
