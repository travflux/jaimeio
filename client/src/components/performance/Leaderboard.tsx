interface LeaderboardItem {
  name: string;
  value: number;
  rank: number;
  delta?: string;
}

interface LeaderboardProps {
  title: string;
  items: LeaderboardItem[];
  onRowClick?: (item: LeaderboardItem) => void;
}

export default function Leaderboard({ title, items, onRowClick }: LeaderboardProps) {
  const max = Math.max(...items.map(i => i.value), 1);

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 ${onRowClick ? "cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-lg" : ""}`}
            onClick={() => onRowClick?.(item)}
          >
            <span className="text-xs font-bold text-muted-foreground w-5 text-right">{item.rank}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{item.name}</span>
                <span className="text-sm font-semibold ml-2">{item.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
        )}
      </div>
    </div>
  );
}
