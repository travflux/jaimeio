import { useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { trpc } from "@/lib/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BarChart3, Users, Globe, Zap, TrendingUp, Target, Loader2, Send } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

const stats = [
  { icon: Users, label: "Monthly Readers", value: "500K+", description: "Engaged, educated audience" },
  { icon: Globe, label: "Global Reach", value: "120+", description: "Countries worldwide" },
  { icon: BarChart3, label: "Avg. Time on Site", value: "4:30", description: "Minutes per session" },
  { icon: TrendingUp, label: "Social Shares", value: "50K+", description: "Monthly social impressions" },
];

const adFormats = [
  {
    title: "Display Advertising",
    description: "Premium banner placements across our homepage, article pages, and category sections. Available in standard IAB sizes with responsive delivery.",
    features: ["Homepage leaderboard", "In-article banners", "Sidebar placements", "Category page sponsorship"],
  },
  {
    title: "Sponsored Content",
    description: "Native articles crafted in our signature editorial voice, clearly labeled as sponsored. A unique way to connect with our audience through humor.",
    features: ["Custom editorial articles", "Branded editorial series", "Social media amplification", "Newsletter inclusion"],
  },
  {
    title: "Newsletter Sponsorship",
    description: "Reach our most loyal subscribers directly in their inbox. Our newsletter boasts high open rates and an engaged readership.",
    features: ["Dedicated newsletter spots", "Custom copy integration", "Subscriber targeting", "Performance reporting"],
  },
];

export default function AdvertisePage() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Advertise on ${siteName} — Reach Our Audience`,
    description: `Partner with ${siteName} to reach an engaged audience of news readers. Display ads, sponsored content, and newsletter sponsorships available.`,
    keywords: "advertise, media kit, sponsored content, display advertising, newsletter sponsorship",
    defaultTitle: siteName,
  });

  const [form, setForm] = useState({ name: "", email: "", company: "", budget: "", message: "" });
  const [sending, setSending] = useState(false);

  const submitForm = trpc.pages.submitContactForm.useMutation({
    onSuccess: () => {
      toast.success("Inquiry submitted! Our advertising team will be in touch within 24 hours.");
      setForm({ name: "", email: "", company: "", budget: "", message: "" });
      setSending(false);
    },
    onError: () => {
      toast.error("Failed to send — please email us directly.");
      setSending(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.company || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    submitForm.mutate({
      formType: "advertise",
      name: form.name,
      email: form.email,
      company: form.company,
      budget: form.budget,
      message: form.message,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container text-center">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Advertise with {branding.siteName}
          </h1>
          <p className="text-lg opacity-60 max-w-2xl mx-auto leading-relaxed">
            Reach a highly engaged audience that values sharp wit and intelligent commentary. Your brand deserves an audience that pays attention.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="container py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="text-center p-6 bg-card border border-border rounded-xl shadow-sm">
              <s.icon className="w-7 h-7 text-primary mx-auto mb-3" />
              <p className="text-2xl md:text-3xl font-bold font-headline tracking-tight">{s.value}</p>
              <p className="text-[14px] font-semibold mt-1">{s.label}</p>
              <p className="text-[13px] text-muted-foreground mt-0.5">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Advertise */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Why {branding.siteName}?</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              Our readers are among the most educated and engaged audiences online. They share more, comment more, and remember the brands they see.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <Target className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Targeted Reach</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Our audience skews educated, affluent, and digitally savvy — ideal for brands seeking quality over quantity.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <Zap className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">High Engagement</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Our content drives conversation. Ads placed alongside our articles benefit from elevated attention and recall.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <Globe className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold text-lg mb-2">Brand Safety</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                All content is editorially reviewed. Your brand appears in a premium, professionally curated environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ad Formats */}
      <section className="container py-14">
        <div className="text-center mb-10">
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Advertising Formats</h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
            Choose from a range of formats designed to integrate seamlessly with our editorial experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {adFormats.map((format, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
              <h3 className="font-headline text-xl font-bold mb-2">{format.title}</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-4 flex-1">
                {format.description}
              </p>
              <ul className="space-y-2">
                {format.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-[14px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="bg-muted/50 py-14">
        <div className="container max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Start a Conversation</h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              Tell us about your brand and goals. Our advertising team will follow up with a tailored proposal.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Company *</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Your company"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Monthly Budget</label>
                  <select
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                  >
                    <option value="">Select a range</option>
                    <option value="under-1k">Under $1,000</option>
                    <option value="1k-5k">$1,000 – $5,000</option>
                    <option value="5k-10k">$5,000 – $10,000</option>
                    <option value="10k-25k">$10,000 – $25,000</option>
                    <option value="25k-plus">$25,000+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5">Tell Us About Your Goals *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="What are you looking to achieve? What audience are you targeting?"
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors resize-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto px-8" disabled={sending}>
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Inquiry</>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
