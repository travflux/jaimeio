import React, { useState, useEffect } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Pencil, Trash2, X } from "lucide-react";

export default function TenantCategories() {
  const { licenseId, settings: init } = useTenantContext();
  const [cats, setCats] = useState<any[]>([]);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#2dd4bf");
  const [desc, setDesc] = useState("");
  const saveMut = trpc.licenseSettings.setBulk.useMutation();

  useEffect(() => {
    if (init?.categories) { try { setCats(JSON.parse(init.categories)); } catch {} }
  }, [init?.categories]);

  const saveCats = async (updated: any[]) => {
    setCats(updated);
    if (licenseId) await saveMut.mutateAsync({ licenseId, settings: { categories: JSON.stringify(updated) } });
  };

  const resetForm = () => { setName(""); setColor("#2dd4bf"); setDesc(""); setEditIdx(null); };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (editIdx !== null) {
      const updated = [...cats];
      updated[editIdx] = { ...updated[editIdx], name: name.trim(), slug, color, description: desc };
      saveCats(updated);
    } else {
      saveCats([...cats, { name: name.trim(), slug, color, description: desc }]);
    }
    resetForm();
  };

  const startEdit = (i: number) => {
    setEditIdx(i); setName(cats[i].name); setColor(cats[i].color || "#2dd4bf"); setDesc(cats[i].description || "");
  };

  const deleteCat = (i: number) => {
    if (confirm("Delete this category?")) saveCats(cats.filter((_, idx) => idx !== i));
  };

  return (
    <TenantLayout pageTitle="Categories" pageSubtitle={cats.length + " categories"} section="Content">
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>{editIdx !== null ? "Edit Category" : "Add Category"}</h3>
          {editIdx !== null && <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={16} /> Cancel</button>}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 40, height: 36, borderRadius: 6, border: "1px solid #e5e7eb", cursor: "pointer" }} />
          <button onClick={handleSubmit} style={{ padding: "8px 16px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {editIdx !== null ? "Save Changes" : "Add"}
          </button>
        </div>
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13 }} />
      </div>
      <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead><tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 40 }}>Color</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Name</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Slug</th>
            <th style={{ textAlign: "left", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11 }}>Description</th>
            <th style={{ textAlign: "right", padding: "10px 16px", fontWeight: 600, color: "#6b7280", fontSize: 11, width: 100 }}>Actions</th>
          </tr></thead>
          <tbody>{cats.map((c, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: editIdx === i ? "#f0fdfa" : "transparent" }}>
              <td style={{ padding: "10px 16px" }}><div style={{ width: 20, height: 20, borderRadius: "50%", background: c.color || "#6b7280" }} /></td>
              <td style={{ padding: "10px 16px", fontWeight: 500 }}>{c.name}</td>
              <td style={{ padding: "10px 16px", color: "#6b7280" }}>{c.slug}</td>
              <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 12 }}>{c.description?.substring(0, 50) || "—"}</td>
              <td style={{ padding: "10px 16px", textAlign: "right" }}>
                <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                  <button onClick={() => startEdit(i)} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}><Pencil size={12} /></button>
                  <button onClick={() => deleteCat(i)} style={{ background: "none", border: "1px solid #ef4444", borderRadius: 4, padding: "4px 8px", cursor: "pointer", color: "#ef4444" }}><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {cats.length === 0 && <p style={{ textAlign: "center", padding: 24, color: "#9ca3af", fontSize: 13 }}>No categories yet. Add your first category above.</p>}
      </div>
    </TenantLayout>
  );
}
