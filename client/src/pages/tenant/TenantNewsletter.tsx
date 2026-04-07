import React, { useState, useRef, useEffect } from "react";
import { Mail, ArrowLeft, Send, Loader2, Users, Eye, MousePointerClick, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import TenantLayout from "@/layouts/TenantLayout";
import { trpc } from "@/lib/trpc";
import { useTenantContext } from "@/hooks/useTenantContext";

function buildEmailHtml(opts: {
  siteName: string;
  websiteUrl: string;
  logoUrl: string;
  primaryColor: string;
  businessName: string;
  businessAddress: string;
  instagram: string;
  twitterX: string;
  linkedin: string;
  greeting: string;
  subject: string;
  previewText: string;
  articles: Array<{ id: number; headline: string; subheadline?: string; slug: string; featuredImage?: string; }>;
  sponsorName: string;
  sponsorTagline: string;
  sponsorUrl: string;
  sponsor2Name?: string;
  sponsor2Tagline?: string;
  sponsor2Url?: string;
}) {
  const {
    siteName, websiteUrl, logoUrl, primaryColor, businessName, businessAddress,
    instagram, twitterX, linkedin, greeting, articles,
    sponsorName, sponsorTagline, sponsorUrl,
    sponsor2Name, sponsor2Tagline, sponsor2Url,
  } = opts;

  const accentColor = primaryColor || "#2dd4bf";

  const articleCards = articles.map(a => {
    const articleUrl = websiteUrl.replace(/\/$/, "") + "/" + a.slug;
    const imgBlock = a.featuredImage
      ? '<img src="' + a.featuredImage + '" alt="" style="width:100%;height:180px;object-fit:cover;display:block;border-radius:6px 6px 0 0;" />'
      : '<div style="width:100%;height:6px;background:' + accentColor + ';border-radius:6px 6px 0 0;"></div>';
    const subBlock = a.subheadline
      ? '<p style="margin:0 0 14px;font-size:14px;color:#6b7280;line-height:1.5;">' + a.subheadline + "</p>"
      : "";
    return (
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">'
      + "<tr><td>" + imgBlock + "</td></tr>"
      + '<tr><td style="padding:16px 20px 20px;">'
      + '<h2 style="margin:0 0 8px;font-size:19px;font-weight:700;line-height:1.3;color:#111827;">' + a.headline + "</h2>"
      + subBlock
      + '<a href="' + articleUrl + '" style="display:inline-block;padding:8px 18px;background:' + accentColor + ';color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Read More</a>'
      + "</td></tr>"
      + "</table>"
    );
  }).join("\n");

  const sponsorBlock = (sponsorName && sponsorUrl)
    ? (
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border-radius:8px;border:2px solid ' + accentColor + ';overflow:hidden;">'
      + '<tr><td style="padding:18px 22px;background:#fafafa;">'
      + '<p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">SPONSORED</p>'
      + '<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827;">' + sponsorName + "</p>"
      + (sponsorTagline ? '<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">' + sponsorTagline + "</p>" : "")
      + '<a href="' + sponsorUrl + '" style="display:inline-block;padding:7px 16px;background:' + accentColor + ';color:#fff;text-decoration:none;border-radius:5px;font-size:12px;font-weight:600;">Learn More</a>'
      + "</td></tr>"
      + "</table>"
    )
    : "";

  const sponsor2Block = (sponsor2Name && sponsor2Url)
    ? (
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;border-radius:8px;border:2px solid ' + accentColor + ';overflow:hidden;">'
      + '<tr><td style="padding:18px 22px;background:#fafafa;">'
      + '<p style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">SPONSORED</p>'
      + '<p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111827;">' + sponsor2Name + "</p>"
      + (sponsor2Tagline ? '<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">' + sponsor2Tagline + "</p>" : "")
      + '<a href="' + sponsor2Url + '" style="display:inline-block;padding:7px 16px;background:' + accentColor + ';color:#fff;text-decoration:none;border-radius:5px;font-size:12px;font-weight:600;">Learn More</a>'
      + "</td></tr>"
      + "</table>"
    )
    : "";

  const socialLinks = [
    instagram ? '<a href="https://instagram.com/' + instagram.replace("@", "") + '" style="color:#9ca3af;text-decoration:none;margin:0 6px;font-size:12px;">Instagram</a>' : "",
    twitterX ? '<a href="https://x.com/' + twitterX.replace("@", "") + '" style="color:#9ca3af;text-decoration:none;margin:0 6px;font-size:12px;">X</a>' : "",
    linkedin ? '<a href="' + linkedin + '" style="color:#9ca3af;text-decoration:none;margin:0 6px;font-size:12px;">LinkedIn</a>' : "",
  ].filter(Boolean).join(" &middot; ");

  const logoBlock = logoUrl
    ? '<img src="' + logoUrl + '" alt="' + siteName + '" style="height:42px;max-width:200px;object-fit:contain;display:block;margin:0 auto 10px;" />'
    : '<p style="margin:0;font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">' + siteName + "</p>";

  const greetingBlock = greeting
    ? '<p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">' + greeting.replace(/\n/g, "<br>") + "</p>"
    : "";

  const addressBlock = businessAddress ? " &middot; " + businessAddress : "";
  const socialRow = socialLinks ? '<p style="margin:0 0 12px;">' + socialLinks + "</p>" : "";

  return (
    "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>"
    + "<body style='margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;'>"
    + "<table width='100%' cellpadding='0' cellspacing='0'><tr><td align='center' style='padding:24px 16px;'>"
    + "<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;'>"
    // Masthead
    + "<tr><td style='background:" + accentColor + ";border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;'>"
    + logoBlock
    + "</td></tr>"
    // Body
    + "<tr><td style='background:#fff;padding:28px 32px 24px;'>"
    + greetingBlock
    + articleCards
    + sponsorBlock
    + sponsor2Block
    + "</td></tr>"
    // Footer
    + "<tr><td style='background:#f9fafb;border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;'>"
    + socialRow
    + '<p style="margin:0 0 6px;font-size:11px;color:#9ca3af;">' + businessName + addressBlock + "</p>"
    + '<p style="margin:0;font-size:11px;color:#9ca3af;">'
    + '<a href="' + websiteUrl + '" style="color:#9ca3af;text-decoration:underline;">' + websiteUrl + "</a>"
    + ' &middot; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>'
    + "</p>"
    + "</td></tr>"
    + "</table></td></tr></table></body></html>"
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    sent:    { bg: "#d1fae5", color: "#065f46", label: "Sent" },
    sending: { bg: "#fef3c7", color: "#92400e", label: "Sending" },
    draft:   { bg: "#f3f4f6", color: "#374151", label: "Draft" },
    failed:  { bg: "#fee2e2", color: "#991b1b", label: "Failed" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export default function TenantNewsletter() {
  const { settings } = useTenantContext();

  const [view, setView] = useState<"list" | "builder">("list");

  // Builder state
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [greeting, setGreeting] = useState("Good morning,\n\nHere is your weekly digest. We hope you enjoy this edition.");
  const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([]);
  const [sponsorName, setSponsorName] = useState("");
  const [sponsorTagline, setSponsorTagline] = useState("");
  const [sponsorUrl, setSponsorUrl] = useState("");
  const [sponsor2Name, setSponsor2Name] = useState("");
  const [sponsor2Tagline, setSponsor2Tagline] = useState("");
  const [sponsor2Url, setSponsor2Url] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Queries
  const subscriberCountQuery = trpc.newsletter.subscriberCount.useQuery(undefined, { staleTime: 30000 });
  const sendsQuery = trpc.newsletter.getSends.useQuery(undefined, { staleTime: 30000 });
  const articlesQuery = trpc.articles.list.useQuery({ status: "published", limit: 30 }, { staleTime: 60000 });

  const subscriberCount = (subscriberCountQuery.data as any)?.count ?? 0;
  const sends = (sendsQuery.data as any)?.sends || [];
  const articles = (articlesQuery.data as any)?.articles || [];

  // Mutations
  const sendTestMut = trpc.newsletter.sendTest.useMutation({
    onSuccess: (r: any) => {
      if (r.success) { toast.success("Test sent to " + testEmail); setTestEmail(""); }
      else toast.error("Test failed", { description: r.error });
    },
    onError: (e: any) => toast.error("Test failed", { description: e.message }),
  });

  const sendMut = trpc.newsletter.send.useMutation({
    onSuccess: (r: any) => {
      if (r.success) {
        toast.success("Newsletter sent to " + r.recipientCount + " subscriber" + (r.recipientCount !== 1 ? "s" : "") + "!");
        setSendConfirmOpen(false);
        setView("list");
        sendsQuery.refetch();
      } else {
        toast.error("Send failed");
      }
    },
    onError: (e: any) => toast.error("Send failed", { description: e.message }),
  });

  // Build HTML
  const selectedArticles = articles.filter((a: any) => selectedArticleIds.includes(a.id));

  const currentHtml = buildEmailHtml({
    siteName: settings?.brand_site_name || settings?.business_name || "Publication",
    websiteUrl: settings?.website_url || "https://example.com",
    logoUrl: settings?.brand_logo_light_url || "",
    primaryColor: settings?.brand_color_primary || "#2dd4bf",
    businessName: settings?.business_name || "",
    businessAddress: settings?.business_address || "",
    instagram: settings?.social_instagram_url || "",
    twitterX: settings?.social_x_url || "",
    linkedin: settings?.social_linkedin_url || "",
    greeting,
    subject,
    previewText,
    articles: selectedArticles,
    sponsorName,
    sponsorTagline,
    sponsorUrl,
    sponsor2Name,
    sponsor2Tagline,
    sponsor2Url,
  });

  // Update iframe
  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) { doc.open(); doc.write(currentHtml); doc.close(); }
    }
  }, [currentHtml]);

  const toggleArticle = (id: number) => {
    setSelectedArticleIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 7) { toast.error("Max 7 articles per newsletter"); return prev; }
      return [...prev, id];
    });
  };

  const handleSendTest = () => {
    if (!testEmail.includes("@")) return;
    sendTestMut.mutate({ to: testEmail, subject: subject || "(No subject)", html: currentHtml });
  };

  const handleSend = () => {
    sendMut.mutate({ subject, previewText, html: currentHtml, articleIds: selectedArticleIds });
  };

  // ============================================================
  // LIST VIEW
  // ============================================================
  if (view === "list") {
    return (
      <TenantLayout
        pageTitle="Newsletter"
        pageSubtitle={subscriberCount + " subscribers"}
        section="Distribution"
        headerActions={
          <button
            onClick={() => setView("builder")}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 34, padding: "0 16px", borderRadius: 6, border: "none", background: "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Mail size={14} /> Compose Newsletter
          </button>
        }>

        {/* Stats bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "14px 18px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={16} style={{ color: "#2dd4bf" }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{subscriberCount.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Subscribers</div>
            </div>
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "14px 18px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Send size={16} style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{sends.length}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Total Sends</div>
            </div>
          </div>
          {sends.length > 0 && (function() {
            const lastSent = sends.filter((s: any) => s.status === "sent");
            const avgOpen = lastSent.length > 0
              ? Math.round(lastSent.reduce((acc: number, s: any) => acc + (s.recipientCount > 0 ? (s.openCount / s.recipientCount) * 100 : 0), 0) / lastSent.length)
              : 0;
            return (
              <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "14px 18px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "#fdf4ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Eye size={16} style={{ color: "#a855f7" }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{avgOpen}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>Avg Open Rate</div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sends list */}
        <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "#111827" }}>Past Sends</h3>
          </div>

          {sendsQuery.isLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
              <Loader2 size={20} style={{ display: "inline-block" }} className="animate-spin" />
              <p style={{ marginTop: 8, fontSize: 13 }}>Loading...</p>
            </div>
          ) : sends.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Mail size={36} style={{ color: "#d1d5db", display: "block", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>No newsletters sent yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 18px" }}>Compose your first newsletter to get started.</p>
              <button
                onClick={() => setView("builder")}
                style={{ padding: "8px 18px", borderRadius: 6, background: "#111827", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Compose Newsletter
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={{ padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>Date</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Recipients</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Open Rate</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Clicks</th>
                  <th style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6b7280", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sends.map((send: any) => {
                  const openRate = send.recipientCount > 0 ? Math.round((send.openCount / send.recipientCount) * 100) : 0;
                  return (
                    <tr key={send.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{send.subject}</div>
                        {send.previewText && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{send.previewText}</div>}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>
                        {send.sentAt ? new Date(send.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, color: "#374151" }}>
                          <Users size={12} style={{ color: "#9ca3af" }} />
                          {(send.recipientCount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, color: "#374151" }}>
                          <Eye size={12} style={{ color: "#9ca3af" }} />
                          {openRate}%
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, color: "#374151" }}>
                          <MousePointerClick size={12} style={{ color: "#9ca3af" }} />
                          {(send.clickCount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <StatusBadge status={send.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </TenantLayout>
    );
  }

  // ============================================================
  // BUILDER VIEW
  // ============================================================
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "#f3f4f6" }}>

      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56, background: "#fff", borderBottom: "1px solid #e5e7eb", flexShrink: 0, zIndex: 10 }}>
        <button
          onClick={() => setView("list")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1, marginLeft: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Compose Newsletter</span>
          {subject && <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>{subject}</span>}
        </div>

        {/* Test send */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSendTest(); }}
            placeholder="test@email.com"
            style={{ width: 180, height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
          />
          <button
            onClick={handleSendTest}
            disabled={sendTestMut.isPending || !testEmail.includes("@")}
            style={{ display: "flex", alignItems: "center", gap: 5, height: 32, padding: "0 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#374151", opacity: !testEmail.includes("@") ? 0.5 : 1 }}>
            {sendTestMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            Send Test
          </button>
        </div>

        {/* Send to all */}
        {!sendConfirmOpen ? (
          <button
            onClick={() => setSendConfirmOpen(true)}
            disabled={!subject.trim() || selectedArticleIds.length === 0}
            style={{ display: "flex", alignItems: "center", gap: 6, height: 32, padding: "0 16px", borderRadius: 6, border: "none", background: (!subject.trim() || selectedArticleIds.length === 0) ? "#9ca3af" : "#111827", color: "#fff", fontSize: 13, fontWeight: 600, cursor: (!subject.trim() || selectedArticleIds.length === 0) ? "not-allowed" : "pointer" }}>
            <Send size={13} /> Send to All ({subscriberCount.toLocaleString()})
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Send to {subscriberCount.toLocaleString()} subscribers?</span>
            <button
              onClick={handleSend}
              disabled={sendMut.isPending}
              style={{ display: "flex", alignItems: "center", gap: 5, height: 32, padding: "0 14px", borderRadius: 6, border: "none", background: "#ef4444", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              {sendMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              Confirm Send
            </button>
            <button
              onClick={() => setSendConfirmOpen(false)}
              style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Two-panel body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left panel: controls */}
        <div style={{ width: 320, flexShrink: 0, background: "#fff", borderRight: "1px solid #e5e7eb", overflowY: "auto", padding: "20px 16px" }}>

          {/* Subject */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Subject Line</label>
              <span style={{ fontSize: 11, color: subject.length > 55 ? "#ef4444" : "#9ca3af" }}>{subject.length}/60</span>
            </div>
            <input
              value={subject}
              onChange={e => { if (e.target.value.length <= 60) setSubject(e.target.value); }}
              placeholder="e.g. This week in [Publication]..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          {/* Preview text */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Preview Text</label>
              <span style={{ fontSize: 11, color: previewText.length > 90 ? "#ef4444" : "#9ca3af" }}>{previewText.length}/100</span>
            </div>
            <input
              value={previewText}
              onChange={e => { if (e.target.value.length <= 100) setPreviewText(e.target.value); }}
              placeholder="Short teaser shown in inbox previews..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, boxSizing: "border-box" }}
            />
          </div>

          {/* Greeting */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Greeting / Intro</label>
            <textarea
              value={greeting}
              onChange={e => setGreeting(e.target.value)}
              rows={4}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 13, resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Article selection */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Articles</label>
              <span style={{ fontSize: 11, color: selectedArticleIds.length >= 7 ? "#ef4444" : "#9ca3af" }}>{selectedArticleIds.length}/7 max</span>
            </div>
            {articlesQuery.isLoading ? (
              <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading articles...</p>
            ) : articles.length === 0 ? (
              <p style={{ fontSize: 12, color: "#9ca3af" }}>No published articles found.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
                {articles.map((a: any) => {
                  const checked = selectedArticleIds.includes(a.id);
                  return (
                    <label
                      key={a.id}
                      style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 6, border: "1px solid " + (checked ? "#2dd4bf" : "#e5e7eb"), background: checked ? "#f0fdfa" : "#fff", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleArticle(a.id)}
                        style={{ marginTop: 2, accentColor: "#2dd4bf" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.headline}</div>
                        {a.subheadline && (
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.subheadline}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sponsor */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>Sponsor (optional)</label>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Sponsor Name</label>
              <input
                value={sponsorName}
                onChange={e => setSponsorName(e.target.value)}
                placeholder="Acme Corp"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Tagline</label>
              <input
                value={sponsorTagline}
                onChange={e => setSponsorTagline(e.target.value)}
                placeholder="The best tool for..."
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Sponsor URL</label>
              <input
                value={sponsorUrl}
                onChange={e => setSponsorUrl(e.target.value)}
                placeholder="https://sponsor.com"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Sponsor 2 */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>Sponsor 2 (optional)</label>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Sponsor Name</label>
              <input
                value={sponsor2Name}
                onChange={e => setSponsor2Name(e.target.value)}
                placeholder="Partner Inc"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Tagline</label>
              <input
                value={sponsor2Tagline}
                onChange={e => setSponsor2Tagline(e.target.value)}
                placeholder="Tagline for sponsor 2..."
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 3 }}>Sponsor URL</label>
              <input
                value={sponsor2Url}
                onChange={e => setSponsor2Url(e.target.value)}
                placeholder="https://sponsor2.com"
                style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, boxSizing: "border-box" }}
              />
            </div>
          </div>
        </div>

        {/* Right panel: preview */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "#f3f4f6" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Eye size={14} style={{ color: "#9ca3af" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280" }}>Live Preview</span>
            {selectedArticleIds.length === 0 && (
              <span style={{ fontSize: 11, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={11} /> Select articles to preview email content
              </span>
            )}
          </div>
          <iframe
            ref={iframeRef}
            style={{ flex: 1, border: "none", background: "#f3f4f6" }}
            title="Newsletter Preview"
          />
        </div>
      </div>
    </div>
  );
}
