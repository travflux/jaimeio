import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { Plus, X as XIcon } from "lucide-react";

const COLORS = ["#2dd4bf","#f97316","#8b5cf6","#3b82f6","#ef4444","#22c55e","#f59e0b","#06b6d4"];

export default function TenantTags() {
  const tagsQuery = trpc.tags.list.useQuery();
  const tags = tagsQuery.data || [];
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    if (!newTag.trim()) return;
    // Tags are global for now — managed via the tagging service
    setNewTag("");
  };

  return (
    <TenantLayout pageTitle="Tags" pageSubtitle={tags.length + " tags"} section="Content">
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add a tag..." onKeyDown={e => e.key === "Enter" && addTag()}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <button onClick={addTag} style={{ padding: "8px 14px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {tags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {tags.map((t: any, i: number) => (
              <span key={t.id || t.name} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 20, fontSize: 13,
                background: "#f3f4f6", border: "1px solid #e5e7eb",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                {t.name}
                {t.articleCount > 0 && <span style={{ fontSize: 10, color: "#6b7280", background: "#e5e7eb", padding: "0 4px", borderRadius: 8 }}>{t.articleCount}</span>}
              </span>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: "#9ca3af" }}>
            <p style={{ fontSize: 14, marginBottom: 4 }}>No tags yet</p>
            <p style={{ fontSize: 12 }}>Tags are auto-generated from articles during workflow runs. You can also add them manually above.</p>
          </div>
        )}
      </div>
    </TenantLayout>
  );
}
