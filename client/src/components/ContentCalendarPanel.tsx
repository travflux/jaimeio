import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save, Trash2, Calendar } from "lucide-react";

export default function ContentCalendarPanel() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Form state
  const [notes, setNotes] = useState("");

  const { data: calendarEntry, refetch: refetchEntry } = trpc.contentCalendar.getEntry.useQuery({ date: selectedDate });
  const { data: calendarRange } = trpc.contentCalendar.getRange.useQuery({
    startDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().split("T")[0],
  });

  const saveEntry = trpc.contentCalendar.upsert.useMutation({
    onSuccess: () => {
      toast.success("Calendar entry saved!");
      refetchEntry();
    },
    onError: (e: any) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteEntry = trpc.contentCalendar.delete.useMutation({
    onSuccess: () => {
      toast.success("Calendar entry deleted!");
      setNotes("");
      refetchEntry();
    },
    onError: (e: any) => toast.error(`Failed to delete: ${e.message}`),
  });

  // Load entry data when selected date changes
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    if (calendarEntry) {
      setNotes(calendarEntry.notes || "");
    } else {
      setNotes("");
    }
  };

  const handleSave = () => {
    saveEntry.mutate({
      date: selectedDate,
      notes: notes || null,
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this calendar entry?")) {
      deleteEntry.mutate({ date: selectedDate });
    }
  };

  // Generate calendar days for current month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    return date.toISOString().split("T")[0];
  });

  const hasEntryForDate = (date: string) => calendarRange?.some(e => e.date === date);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Calendar</CardTitle>
          <CardDescription>Schedule and annotate daily content in advance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-sm font-semibold">
              {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {calendarDays.map(date => {
              const isSelected = date === selectedDate;
              const hasEntry = hasEntryForDate(date);
              const isToday = date === new Date().toISOString().split("T")[0];
              
              return (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors flex items-center justify-center relative ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {parseInt(date.split("-")[2])}
                  {hasEntry && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
                </button>
              );
            })}
          </div>

          {/* Entry Details */}
          <div className="border-t pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Selected Date</label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add notes about this day's content..."
                value={notes}
                onChange={(e: any) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={saveEntry.isPending}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveEntry.isPending ? "Saving..." : "Save Entry"}
              </Button>
              {calendarEntry && (
                <Button
                  onClick={handleDelete}
                  disabled={deleteEntry.isPending}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteEntry.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
