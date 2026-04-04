import React, { useState } from "react";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Eye, EyeOff, Copy, RefreshCw } from "lucide-react";

export default function TenantApiAccess() {
  const { licenseId } = useTenantContext();
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const keyQuery = trpc.apiAccess.get.useQuery({ licenseId }, { enabled: !!licenseId });
  const genMut = trpc.apiAccess.generate.useMutation({ onSuccess: () => keyQuery.refetch() });
  const regenMut = trpc.apiAccess.regenerate.useMutation({ onSuccess: () => keyQuery.refetch() });
  const [revealed, setRevealed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const data = keyQuery.data;
  const hasKey = !!data?.apiKey;

  const handleCopy = () => {
    if (data?.fullKey) {
      navigator.clipboard.writeText(data.fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TenantLayout pageTitle="API Access" pageSubtitle="Manage your API key and endpoints" section="Overview">
      {/* Info */}
      <div style={{ background: "#eff6ff", borderRadius: 8, padding: 16, marginBottom: 16, border: "1px solid #bfdbfe" }}>
        <p style={{ fontSize: 13, color: "#1e40af", lineHeight: 1.6, margin: 0 }}>
          Your JAIME.IO API key allows external tools, scripts, and integrations to access your publication programmatically.
          Use it to read articles, trigger workflows, and retrieve analytics from your own applications.
        </p>
      </div>

      {/* API Key */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb", marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Your API Key</h3>

        {!hasKey ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 12 }}>No API key generated yet.</p>
            <button onClick={() => genMut.mutate({ licenseId })} disabled={genMut.isPending}
              style={{ padding: "10px 24px", borderRadius: 6, background: "#2dd4bf", color: "#0f2d5e", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              {genMut.isPending ? "Generating..." : "Generate API Key"}
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "monospace", fontSize: 14, background: "#f9fafb", padding: "12px 16px", borderRadius: 6, border: "1px solid #e5e7eb", color: "#374151", wordBreak: "break-all" }}>
              {revealed ? data?.fullKey : data?.apiKey}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => setRevealed(!revealed)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12, cursor: "pointer" }}>
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />} {revealed ? "Hide" : "Reveal"}
              </button>
              <button onClick={handleCopy} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12, cursor: "pointer" }}>
                <Copy size={14} /> {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={() => setShowConfirm(true)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 6, background: "#fff", border: "1px solid #ef4444", fontSize: 12, cursor: "pointer", color: "#ef4444", marginLeft: "auto" }}>
                <RefreshCw size={14} /> Regenerate
              </button>
            </div>

            {showConfirm && (
              <div style={{ marginTop: 12, padding: 12, background: "#fef2f2", borderRadius: 6, border: "1px solid #fecaca" }}>
                <p style={{ fontSize: 13, color: "#991b1b", marginBottom: 8 }}>Are you sure? Your current API key will stop working immediately.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { regenMut.mutate({ licenseId }); setShowConfirm(false); setRevealed(false); }}
                    style={{ padding: "6px 14px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {regenMut.isPending ? "Regenerating..." : "Yes, Regenerate"}
                  </button>
                  <button onClick={() => setShowConfirm(false)}
                    style={{ padding: "6px 14px", borderRadius: 6, background: "#fff", border: "1px solid #e5e7eb", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Endpoints */}
      <div style={{ background: "#fff", borderRadius: 8, padding: 20, border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>API Endpoints</h3>
        <div style={{ fontFamily: "monospace", fontSize: 12, background: "#f9fafb", padding: 16, borderRadius: 6, lineHeight: 2, color: "#374151" }}>
          <span style={{ color: "#22c55e" }}>GET</span>  https://{hostname}/api/v1/articles<br />
          <span style={{ color: "#3b82f6" }}>POST</span> https://{hostname}/api/v1/workflow/run<br />
          <span style={{ color: "#22c55e" }}>GET</span>  https://{hostname}/api/v1/stats
        </div>
        <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 6 }}>
          <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 4px" }}>Include your API key as a Bearer token:</p>
          <code style={{ fontSize: 12, color: "#374151" }}>Authorization: Bearer YOUR_API_KEY</code>
        </div>
        <a href="https://docs.getjaime.io/api" target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "#2dd4bf", fontWeight: 600, textDecoration: "none" }}>
          View API Documentation →
        </a>
      </div>
    </TenantLayout>
  );
}
