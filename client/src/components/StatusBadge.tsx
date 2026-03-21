import { cn } from "@/lib/utils";

type BadgeVariant = "article" | "workflow" | "social" | "comment";

const ARTICLE_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const WORKFLOW_COLORS: Record<string, string> = {
  gathering: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  generating: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  pending_approval: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  publishing: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const SOCIAL_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  posted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const COMMENT_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const COLOR_MAPS: Record<BadgeVariant, Record<string, string>> = {
  article: ARTICLE_COLORS,
  workflow: WORKFLOW_COLORS,
  social: SOCIAL_COLORS,
  comment: COMMENT_COLORS,
};

interface StatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
  /** Show a pulsing dot indicator */
  dot?: boolean;
}

export default function StatusBadge({ status, variant = "article", className, dot }: StatusBadgeProps) {
  const colors = COLOR_MAPS[variant] ?? ARTICLE_COLORS;
  const colorClass = colors[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide leading-none",
        colorClass,
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {label}
    </span>
  );
}
