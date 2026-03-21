import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Sparkles, Gamepad2 } from "lucide-react";

export default function CalendarPreviewWidget() {
  // Get next 14 days of calendar entries
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  const endDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: calendarEntries, isLoading } = trpc.contentCalendar.getRange.useQuery({
    startDate,
    endDate,
  });

  // Group entries by week
  const weekGroups = useMemo(() => {
    if (!calendarEntries) return [];
    
    const groups: Record<number, typeof calendarEntries> = {};
    calendarEntries.forEach(entry => {
      const date = new Date(entry.date + "T00:00:00");
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.getTime();
      
      if (!groups[weekKey]) groups[weekKey] = [];
      groups[weekKey].push(entry);
    });
    
    return Object.entries(groups)
      .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB))
      .map(([_, entries]) => entries);
  }, [calendarEntries]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading schedule...</div>
        </CardContent>
      </Card>
    );
  }

  if (!calendarEntries || calendarEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No scheduled content for the next 2 weeks</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming Schedule (Next 14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {weekGroups.map((weekEntries, weekIndex) => {
          const firstDate = new Date(weekEntries[0].date + "T00:00:00");
          const weekLabel = firstDate.toLocaleDateString("default", {
            month: "short",
            day: "numeric",
          });

          return (
            <div key={weekIndex} className="space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Week of {weekLabel}
              </div>
              <div className="space-y-2">
                {weekEntries.map(entry => (
                  <div key={entry.date} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50 border border-border">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-foreground">
                        {new Date(entry.date + "T00:00:00").toLocaleDateString("default", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                      
                      
                      
                      {entry.notes && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
