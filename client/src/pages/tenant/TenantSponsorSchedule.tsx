import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, background: "#fff" };

export default function TenantSponsorSchedule() {
  const [slots, setSlots] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const { data } = trpc.sponsors.getSchedule.useQuery();
  const saveMut = trpc.sponsors.saveSchedule.useMutation({
    onSuccess: () => { toast.success("Schedule saved"); setSaving(false); },
    onError: () => { toast.error("Failed to save"); setSaving(false); },
  });

  useEffect(() => { if (data?.slots) setSlots(data.slots.map((s: any) => ({ ...s }))); }, [data]);

  const addSlot = (day: number) => setSlots(p => [...p, { dayOfWeek: day, sponsorName: "", sponsorUrl: "", sponsorTagline: "", logoUrl: "", isActive: true }]);
  const removeSlot = (i: number) => setSlots(p => p.filter((_, idx) => idx !== i));
  const updSlot = (i: number, k: string, v: string) => setSlots(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s));

  const handleSave = () => { setSaving(true); saveMut.mutate({ slots }); };

  return (
    <TenantLayout pageTitle="Sponsor Schedule" pageSubtitle="Assign sponsors to days of the week" section="Monetization" saveAction={handleSave}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {DAYS.map((day, di) => {
          const daySlots = slots.map((s, i) => ({ s, i })).filter(({ s }) => s.dayOfWeek === di);
          return (
            <div key={day} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>{day}</h3>
                <button onClick={() => addSlot(di)} style={{ fontSize: 11, color: "#2dd4bf", background: "none", border: "none", cursor: "pointer" }}>+ Add Sponsor</button>
              </div>
              {daySlots.length === 0 ? (
                <p style={{ fontSize: 12, color: "#9ca3af" }}>No sponsor — bar hidden on this day</p>
              ) : daySlots.map(({ s, i }) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 8, position: "relative" }}>
                  <button onClick={() => removeSlot(i)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 11 }}>Remove</button>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div><label style={{ fontSize: 10, color: "#9ca3af" }}>Name</label><input style={inputStyle} value={s.sponsorName} onChange={e => updSlot(i, "sponsorName", e.target.value)} placeholder="Acme Corp" /></div>
                    <div><label style={{ fontSize: 10, color: "#9ca3af" }}>URL</label><input style={inputStyle} value={s.sponsorUrl} onChange={e => updSlot(i, "sponsorUrl", e.target.value)} placeholder="https://acme.com" /></div>
                    <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 10, color: "#9ca3af" }}>Tagline</label><input style={inputStyle} value={s.sponsorTagline} onChange={e => updSlot(i, "sponsorTagline", e.target.value)} placeholder="Today's sponsor: Acme — The best tools for creators" /></div>
                    <div><label style={{ fontSize: 10, color: "#9ca3af" }}>Logo URL</label><input style={inputStyle} value={s.logoUrl} onChange={e => updSlot(i, "logoUrl", e.target.value)} placeholder="https://acme.com/logo.png" /></div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </TenantLayout>
  );
}
