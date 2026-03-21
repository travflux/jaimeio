import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";

export type SettingMap = Record<string, string>;

export function useSettings() {
  const { data: settingsRaw, isLoading } = trpc.settings.list.useQuery();
  const utils = trpc.useUtils();

  const settings: SettingMap = useMemo(() => {
    if (!settingsRaw) return {};
    const map: SettingMap = {};
    for (const s of settingsRaw) { map[s.key] = s.value; }
    return map;
  }, [settingsRaw]);

  const [edits, setEdits] = useState<SettingMap>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settingsRaw && Object.keys(edits).length === 0) {
      const map: SettingMap = {};
      for (const s of settingsRaw) { map[s.key] = s.value; }
      setEdits(map);
    }
  }, [settingsRaw]);

  const updateEdit = useCallback((key: string, value: string) => {
    setEdits(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const bulkUpdate = trpc.settings.bulkUpdate.useMutation({
    onSuccess: async () => {
      toast.success("Settings saved successfully!");
      setHasChanges(false);
      utils.settings.list.invalidate();
      try {
        const res = await fetch("/api/scheduler/refresh", { method: "POST" });
        await res.json();
        toast.success("Scheduler updated with new settings.");
      } catch {
        toast.info("Settings saved. Scheduler will pick up changes on next restart.");
      }
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const handleSaveAll = useCallback(() => {
    if (!settingsRaw) return;
    const changed = settingsRaw
      .filter(s => edits[s.key] !== undefined && edits[s.key] !== s.value)
      .map(s => ({ key: s.key, value: edits[s.key], label: s.label ?? undefined, description: s.description ?? undefined, category: s.category ?? undefined, type: s.type as any }));

    const existingKeys = new Set(settingsRaw.map(s => s.key));
    const newKeys = Object.entries(edits)
      .filter(([k]) => !existingKeys.has(k))
      .map(([key, value]) => ({ key, value, category: "schedule", type: "string" as const }));

    const allChanges = [...changed, ...newKeys];
    if (allChanges.length === 0) { toast.info("No changes to save."); return; }
    bulkUpdate.mutate({ settings: allChanges });
  }, [settingsRaw, edits, bulkUpdate]);

  return {
    settings,
    settingsRaw,
    edits,
    updateEdit,
    hasChanges,
    handleSaveAll,
    isLoading,
    isSaving: bulkUpdate.isPending,
    utils,
  };
}
