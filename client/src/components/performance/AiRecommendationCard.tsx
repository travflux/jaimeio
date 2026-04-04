import { Sparkles } from "lucide-react";

interface AiRecommendationCardProps {
  insight: string;
  confidence: "high" | "medium" | "low";
  category: string;
  action?: string;
}

const confidenceColors = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function AiRecommendationCard({ insight, confidence, category, action }: AiRecommendationCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground">{category}</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceColors[confidence]}`}>
              {confidence}
            </span>
          </div>
          <p className="text-sm">{insight}</p>
          {action && (
            <p className="text-xs text-primary font-medium mt-2 cursor-pointer hover:underline">{action}</p>
          )}
        </div>
      </div>
    </div>
  );
}
