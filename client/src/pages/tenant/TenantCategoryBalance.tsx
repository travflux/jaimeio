import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TenantCategoryBalance() {
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const { data } = trpc.categories.getBalance.useQuery();
  const saveMut = trpc.categories.saveTargets.useMutation({
    onSuccess: () => { toast.success("Targets saved"); setSaving(false); },
    onError: () => { toast.error("Failed to save"); setSaving(false); },
  });

  useEffect(() => {
    if (data?.categories) {
      const init: Record<number, number> = {};
      const equal = Math.round(100 / (data.categories.length || 1));
      data.categories.forEach((c: any) => { init[c.id] = c.targetPercentage ?? equal; });
      setTargets(init);
    }
  }, [data]);

  const total = Object.values(targets).reduce((s, v) => s + v, 0);
  const balanced = total === 100;
  const cats = data?.categories || [];

  const handleSave = () => {
    if (!balanced) { toast.error("Targets must add up to 100% (currently " + total + "%)"); return; }
    setSaving(true);
    const t: Record<string, number> = {};
    for (const [k, v] of Object.entries(targets)) t[String(k)] = v;
    saveMut.mutate({ targets: t });
  };

  const distributeEvenly = () => {
    const eq = Math.floor(100 / cats.length);
    const rem = 100 - eq * cats.length;
    const n: Record<number, number> = {};
    cats.forEach((c: any, i: number) => { n[c.id] = eq + (i === 0 ? rem : 0); });
    setTargets(n);
  };

  const evenBtn = <button onClick={distributeEvenly} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer" }}>Distribute Evenly</button>;

  return (
    <TenantLayout pageTitle="Category Balance" pageSubtitle="Set target content distribution" section="Analytics"
      saveAction={handleSave} headerActions={evenBtn}>

      <div style={{ padding: "8px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13,
        background: balanced ? "#f0fdf4" : "#fffbeb", color: balanced ? "#166534" : "#92400e", border: balanced ? "1px solid #bbf7d0" : "1px solid #fde68a" }}>
        {balanced ? "Targets add up to 100% — ready to save" : "Targets add up to " + total + "% — must equal 100%"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cats.map((cat: any) => {
          const cur = cat.currentPercentage || 0;
          const tgt = targets[cat.id] || 0;
          const diff = Math.abs(cur - tgt);
          const statusColor = diff <= 5 ? "#22c55e" : diff <= 15 ? "#f59e0b" : "#ef4444";
          const statusText = diff <= 5 ? "On target" : cur > tgt ? "Over target" : "Needs content";

          return (
            <div key={cat.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>{cat.articleCount} articles</span>
                </div>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: statusColor + "15", color: statusColor, fontWeight: 600 }}>{statusText}</span>
              </div>
              {/* Current bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", width: 56 }}>Current</span>
                <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: statusColor, width: cur + "%", transition: "width 0.3s" }} />
                </div>
                <span style={{ fontSize: 11, fontFamily: "monospace", width: 32, textAlign: "right" }}>{cur}%</span>
              </div>
              {/* Target bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#9ca3af", width: 56 }}>Target</span>
                <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 3, background: "#2dd4bf40", width: tgt + "%", transition: "width 0.3s" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 2, width: 52, justifyContent: "flex-end" }}>
                  <input type="number" min={0} max={100} value={tgt}
                    onChange={e => setTargets(p => ({ ...p, [cat.id]: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) }))}
                    style={{ width: 36, fontSize: 11, fontFamily: "monospace", textAlign: "right", border: "1px solid #e5e7eb", borderRadius: 4, padding: "2px 4px" }} />
                  <span style={{ fontSize: 11 }}>%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cats.length === 0 && <p style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>No categories found. Create categories first in Content → Categories.</p>}
    </TenantLayout>
  );
}
