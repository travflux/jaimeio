import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { FileText, Save, RotateCcw } from "lucide-react";

const PAGES = [
  { slug: "advertise", label: "Advertise Page" },
  { slug: "privacy", label: "Privacy Policy & Terms" },
  { slug: "contact", label: "Contact Page" },
  { slug: "about", label: "About Page" },
];

function PageEditor({ slug, licenseId }: { slug: string; licenseId: number }) {
  const { data: content, isLoading, refetch } = trpc.pages.get.useQuery({ licenseId, slug });
  const updateMutation = trpc.pages.update.useMutation({ onSuccess: () => refetch() });
  const resetMutation = trpc.pages.reset.useMutation({ onSuccess: () => refetch() });
  const [edited, setEdited] = useState<Record<string, any>>({});

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading...</div>;

  const merged = { ...(content || {}), ...edited };
  const hasChanges = Object.keys(edited).length > 0;

  const handleSave = () => {
    updateMutation.mutate({ licenseId, slug, content: JSON.stringify(merged) });
    setEdited({});
  };

  const handleReset = () => {
    if (confirm("Reset this page to defaults? Your customizations will be lost.")) {
      resetMutation.mutate({ licenseId, slug });
      setEdited({});
    }
  };

  const field = (key: string, label: string, type: "text" | "textarea" = "text") => (
    <div className="mb-4" key={key}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="w-full px-3 py-2 border rounded-md text-sm"
          rows={3}
          value={edited[key] ?? merged[key] ?? ""}
          onChange={e => setEdited(p => ({ ...p, [key]: e.target.value }))}
        />
      ) : (
        <input
          className="w-full px-3 py-2 border rounded-md text-sm"
          value={edited[key] ?? merged[key] ?? ""}
          onChange={e => setEdited(p => ({ ...p, [key]: e.target.value }))}
        />
      )}
    </div>
  );

  const toggle = (key: string, label: string) => (
    <div className="mb-4 flex items-center gap-2" key={key}>
      <input
        type="checkbox"
        checked={edited[key] ?? merged[key] ?? false}
        onChange={e => setEdited(p => ({ ...p, [key]: e.target.checked }))}
        className="w-4 h-4"
      />
      <label className="text-sm">{label}</label>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">{PAGES.find(p => p.slug === slug)?.label}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMutation.isPending}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {slug === "advertise" && (
        <>
          {field("hero_heading", "Hero Heading")}
          {field("hero_subtext", "Hero Subtext", "textarea")}
          <div className="grid grid-cols-2 gap-4">
            {field("stat_1_label", "Stat 1 Label")}
            {field("stat_1_value", "Stat 1 Value (or 'auto')")}
            {field("stat_2_label", "Stat 2 Label")}
            {field("stat_2_value", "Stat 2 Value (or 'auto')")}
            {field("stat_3_label", "Stat 3 Label")}
            {field("stat_3_value", "Stat 3 Value (or 'auto')")}
          </div>
          <h3 className="text-md font-semibold mt-4 mb-2">Why Advertise Section</h3>
          {field("why_heading", "Section Heading")}
          {field("why_1_title", "Card 1 Title")}
          {field("why_1_text", "Card 1 Text", "textarea")}
          {field("why_2_title", "Card 2 Title")}
          {field("why_2_text", "Card 2 Text", "textarea")}
          {field("why_3_title", "Card 3 Title")}
          {field("why_3_text", "Card 3 Text", "textarea")}
          {field("form_heading", "Form Heading")}
          {field("form_subtext", "Form Subtext")}
        </>
      )}

      {slug === "privacy" && (
        <>
          {field("effective_date", "Effective Date")}
          {field("custom_intro", "Custom Introduction (shown above standard text)", "textarea")}
          <p className="text-xs text-muted-foreground mt-2">Standard legal text is auto-generated from your business info in Settings → Brand.</p>
        </>
      )}

      {slug === "contact" && (
        <>
          {field("hero_heading", "Hero Heading")}
          {field("hero_subtext", "Hero Subtext")}
          {toggle("show_address", "Show Address")}
          {toggle("show_phone", "Show Phone")}
          {toggle("show_email", "Show Email")}
          {field("custom_message", "Custom Message (above form)", "textarea")}
        </>
      )}

      {slug === "about" && (
        <>
          {field("hero_heading", "Page Heading")}
          {field("hero_subtext", "Subtitle")}
          {field("body", "Page Body", "textarea")}
        </>
      )}

      {(updateMutation.isSuccess || resetMutation.isSuccess) && (
        <p className="text-green-600 text-sm mt-2">Saved successfully!</p>
      )}
    </div>
  );
}

export default function AdminPages() {
  const [selected, setSelected] = useState("advertise");
  // TODO: get licenseId from context — for now use a fixed approach
  // The admin pages are accessed from the super admin, so we use license 7 as default
  // In a real implementation, this would come from the tenant context
  const licenseId = 7; // Will be dynamic in full implementation

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Publication Pages</h1>
        <div className="grid grid-cols-[200px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-1">
            {PAGES.map(p => (
              <button
                key={p.slug}
                onClick={() => setSelected(p.slug)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  selected === p.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                }`}
              >
                <FileText className="w-4 h-4" />
                {p.label}
              </button>
            ))}
          </div>
          {/* Editor */}
          <div className="border rounded-lg p-6">
            <PageEditor key={selected} slug={selected} licenseId={licenseId} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
