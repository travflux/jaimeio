import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plus, X, Eye, EyeOff, Trash2, Instagram } from "lucide-react";

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;
const DAY_SHORT: Record<string, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
const PLATFORM_LABELS: Record<string, string> = { instagram: "Instagram", x: "X / Twitter", twitter: "X / Twitter", linkedin: "LinkedIn", facebook: "Facebook", threads: "Threads", tiktok: "TikTok", youtube: "YouTube" };

interface SlotConfig { platform: string; day: typeof DAYS[number]; hour: number; minute: number; }

export default function TenantDistribution() {
  const { licenseId, settings: init } = useTenantContext();
  const [s, setS] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const utils = trpc.useUtils();

  const saveMut = trpc.licenseSettings.setBulk.useMutation();
  useEffect(() => { if (init) { setS(init); setApiKeyDraft(init.blotato_api_key || ""); } }, [init]);
  const update = (k: string, v: string) => setS(p => ({ ...p, [k]: v }));

  // Blotato data
  const accountsQuery = trpc.distribution.getBlotatoAccounts.useQuery(undefined, { staleTime: 30000 });
  const slotsQuery = trpc.distribution.getScheduleSlots.useQuery(undefined, { staleTime: 30000 });
  useEffect(() => { if (slotsQuery.data) setSlots(slotsQuery.data as SlotConfig[]); }, [slotsQuery.data]);

  const syncAccountsMut = trpc.distribution.syncBlotatoAccounts.useMutation({
    onSuccess: (r: any) => { toast.success("Synced " + r.count + " accounts"); utils.distribution.getBlotatoAccounts.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const saveApiKeyMut = trpc.distribution.saveBlotatoApiKey.useMutation({
    onSuccess: () => { toast.success("API key saved — syncing accounts..."); setTimeout(() => utils.distribution.getBlotatoAccounts.invalidate(), 2000); },
    onError: (e: any) => toast.error(e.message),
  });
  const saveSlotsMut = trpc.distribution.saveScheduleSlots.useMutation({
    onSuccess: () => toast.success("Schedule saved and synced to Blotato"),
    onError: (e: any) => toast.error("Save failed", { description: e.message }),
  });

  const activityQuery = trpc.distribution.getRecentActivity.useQuery(undefined, { staleTime: 30000 });
  const pollMut = trpc.distribution.pollBlotatoStatuses.useMutation({
    onSuccess: (r: any) => { if (r.updated > 0) toast.success("Updated " + r.updated + " post(s)"); else toast.success("All posts up to date"); activityQuery.refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const accounts = accountsQuery.data?.accounts || [];
  const hasApiKey = accountsQuery.data?.hasApiKey || false;

  const handleSaveSettings = async () => {
    if (!licenseId) return;
    await saveMut.mutateAsync({ licenseId, settings: s });
  };

  const addSlot = (platform: string) => {
    setSlots(prev => [...prev, { platform, day: "monday", hour: 9, minute: 0 }]);
  };
  const removeSlot = (index: number) => setSlots(prev => prev.filter((_, i) => i !== index));
  const updateSlot = (index: number, field: string, value: any) => {
    setSlots(prev => prev.map((sl, i) => i === index ? { ...sl, [field]: value } : sl));
  };

  const template = s.blotato_post_template || "{headline}\n\n{url}";
  const preview = template.replace("{headline}", "Your Article Headline Here").replace("{url}", "https://example.com/article/sample").replace("{summary}", "A brief excerpt...").replace("{category}", "Category");

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <button onClick={() => update(k, s[k] === "true" ? "false" : "true")}
        style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: s[k] === "true" ? "#2dd4bf" : "#d1d5db", position: "relative" }}>
        <span style={{ position: "absolute", top: 2, left: s[k] === "true" ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
      </button>
    </div>
  );

  return (
    <TenantLayout pageTitle="Distribution" pageSubtitle="Blotato social media integration" section="Social Media" saveAction={handleSaveSettings}>

      {/* API Key */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Blotato Connection</h3>
        <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>API Key</label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <input type={showKey ? "text" : "password"} value={apiKeyDraft} onChange={e => setApiKeyDraft(e.target.value)}
              placeholder="blt_..." style={{ width: "100%", padding: "8px 36px 8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
            <button onClick={() => setShowKey(!showKey)} style={{ position: "absolute", right: 8, top: 6, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button onClick={() => saveApiKeyMut.mutate({ apiKey: apiKeyDraft })}
            disabled={saveApiKeyMut.isPending || !apiKeyDraft || apiKeyDraft.length < 10}
            style={{ padding: "8px 16px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {saveApiKeyMut.isPending ? "Saving..." : "Save Key"}
          </button>
        </div>
        {hasApiKey && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>API key configured</div>}
      </div>

      {/* Connected Accounts */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Connected Accounts</h3>
          <button onClick={() => syncAccountsMut.mutate()} disabled={syncAccountsMut.isPending || !hasApiKey}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>
            {syncAccountsMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Sync from Blotato
          </button>
        </div>
        {accounts.length === 0 ? (
          <p style={{ fontSize: 13, color: "#9ca3af" }}>
            {hasApiKey
              ? 'No accounts found. Connect platforms at my.blotato.com, then click "Sync from Blotato".'
              : "Add your Blotato API key above to get started."}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {accounts.map((a: any) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb" }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", textTransform: "capitalize" }}>
                  {PLATFORM_LABELS[a.platform] || a.platform}
                </span>
                <span style={{ fontSize: 13, color: "#374151" }}>@{a.username}</span>
                <span style={{ marginLeft: "auto", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#d1fae5", color: "#065f46" }}>Connected</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Posting Schedule */}
      {accounts.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Posting Schedule</h3>
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>Configure when posts go live on each platform</p>

          {accounts.map((account: any) => {
            const platformSlots = slots.filter(sl => sl.platform === account.platform);
            return (
              <div key={account.platform} style={{ marginBottom: 16, padding: 16, borderRadius: 8, border: "1px solid #f3f4f6", background: "#fafafa" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>{PLATFORM_LABELS[account.platform] || account.platform}</span>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>@{account.username}</span>
                </div>

                {platformSlots.length === 0 && (
                  <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>No time slots configured</p>
                )}

                {slots.map((slot, i) => {
                  if (slot.platform !== account.platform) return null;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <select value={slot.day} onChange={e => updateSlot(i, "day", e.target.value)}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, background: "#fff" }}>
                        {DAYS.map(d => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
                      </select>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>at</span>
                      <select value={slot.hour} onChange={e => updateSlot(i, "hour", parseInt(e.target.value))}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, background: "#fff" }}>
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>{String(h).padStart(2, "0")}:{String(slot.minute).padStart(2, "0")}</option>
                        ))}
                      </select>
                      <select value={slot.minute} onChange={e => updateSlot(i, "minute", parseInt(e.target.value))}
                        style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, background: "#fff", width: 55 }}>
                        <option value={0}>:00</option>
                        <option value={15}>:15</option>
                        <option value={30}>:30</option>
                        <option value={45}>:45</option>
                      </select>
                      <button onClick={() => removeSlot(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                <button onClick={() => addSlot(account.platform)}
                  style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 6, border: "1px dashed #d1d5db", background: "transparent", fontSize: 12, cursor: "pointer", color: "#6b7280", marginTop: 4 }}>
                  <Plus size={12} /> Add Time Slot
                </button>
              </div>
            );
          })}

          <button onClick={() => saveSlotsMut.mutate({ slots })} disabled={saveSlotsMut.isPending}
            style={{ marginTop: 8, padding: "10px 20px", borderRadius: 6, background: saveSlotsMut.isPending ? "#9ca3af" : "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {saveSlotsMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save Schedule"}
          </button>
        </div>
      )}

      {/* Platform Toggles */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Enabled Platforms</h3>
        <Toggle k="blotato_x_enabled" label="X / Twitter" />
        <Toggle k="blotato_instagram_enabled" label="Instagram" />
        <Toggle k="blotato_linkedin_enabled" label="LinkedIn" />
        <Toggle k="blotato_facebook_enabled" label="Facebook" />
        <Toggle k="blotato_threads_enabled" label="Threads" />
      </div>

      {/* Recent Activity */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Distribution</h3>
          <button onClick={() => pollMut.mutate()} disabled={pollMut.isPending}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>
            {pollMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Check Statuses
          </button>
        </div>
        {activityQuery.isLoading ? (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading...</p>
        ) : (activityQuery.data?.items || []).length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>No distribution activity yet. Distribute an article to see results here.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {(activityQuery.data?.items || []).map((item: any) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: "#f3f4f6", color: "#374151", textTransform: "capitalize", width: 70, textAlign: "center" }}>
                  {PLATFORM_LABELS[item.platform] || item.platform}
                </span>
                <span style={{ fontSize: 12, color: "#374151", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.articleHeadline?.substring(0, 50)}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: item.status === "sent" ? "#d1fae5" : item.status === "failed" ? "#fee2e2" : "#fef3c7",
                  color: item.status === "sent" ? "#065f46" : item.status === "failed" ? "#991b1b" : "#92400e" }}>
                  {item.status === "sent" ? "Published" : item.status === "failed" ? "Failed" : "Pending"}
                </span>
                {item.postUrl && (
                  <a href={item.postUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#2dd4bf", textDecoration: "none" }}>View</a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Post Template */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Post Template</h3>
        <textarea value={s.blotato_post_template || ""} onChange={e => update("blotato_post_template", e.target.value)} rows={3}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", marginBottom: 8 }} placeholder={"{headline}\n{url}"} />
        <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 8 }}>Variables: {"{headline}"} {"{url}"} {"{summary}"} {"{category}"}</div>
        <div style={{ background: "#f9fafb", padding: 12, borderRadius: 6, fontSize: 12, color: "#374151", whiteSpace: "pre-wrap" }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "#6b7280" }}>Preview:</div>
          {preview}
        </div>
      </div>
    </TenantLayout>
  );
}
