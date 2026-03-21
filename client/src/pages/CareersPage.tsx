import { useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Pen, Code, Megaphone, BarChart3, Heart, Globe, Laptop, Coffee, Sparkles, Loader2, Send, Briefcase } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

const stats = [
  { icon: Pen, label: "Articles Published", value: "10K+", description: "And counting daily" },
  { icon: Globe, label: "Global Audience", value: "120+", description: "Countries reached" },
  { icon: Coffee, label: "Remote-First", value: "100%", description: "Work from anywhere" },
  { icon: Heart, label: "Team Satisfaction", value: "98%", description: "Love what they do" },
];

const perks = [
  {
    icon: Laptop,
    title: "Fully Remote",
    description: "Work from anywhere in the world. We believe great content can be written from a beach, a coffee shop, or your couch.",
  },
  {
    icon: Sparkles,
    title: "Creative Freedom",
    description: "We trust our team to push boundaries. If it's funny, sharp, and well-crafted, we'll publish it.",
  },
  {
    icon: Heart,
    title: "Generous Benefits",
    description: "Competitive salary, health coverage, unlimited PTO, and a home office stipend to keep you comfortable.",
  },
];

const openPositions = [
  {
    title: "Senior Writer",
    department: "Editorial",
    type: "Full-time",
    location: "Remote",
    description: "Craft sharp, engaging articles on politics, tech, and culture. You'll need a strong portfolio, a quick wit, and the ability to turn breaking news into compelling content within hours.",
    requirements: ["3+ years writing experience", "Published clips in recognized outlets", "Ability to write under tight deadlines", "Deep knowledge of current events"],
  },
  {
    title: "Social Media Manager",
    department: "Marketing",
    type: "Full-time",
    location: "Remote",
    description: "Grow our social presence across X, Instagram, Facebook, and emerging platforms. You'll craft viral-worthy posts and manage our community of enthusiasts.",
    requirements: ["2+ years social media management", "Experience with humor/entertainment brands", "Strong copywriting skills", "Analytics-driven mindset"],
  },
  {
    title: "Full-Stack Developer",
    department: "Engineering",
    type: "Full-time",
    location: "Remote",
    description: "Build and maintain the platform that delivers content to hundreds of thousands of readers. Work with React, TypeScript, and Node.js in a fast-paced editorial environment.",
    requirements: ["3+ years full-stack experience", "Proficiency in React & TypeScript", "Experience with Node.js backends", "Passion for media and publishing"],
  },
  {
    title: "Illustrator / Cartoonist",
    department: "Creative",
    type: "Contract",
    location: "Remote",
    description: "Create editorial cartoons and illustrations that complement our articles. Your work will be seen by hundreds of thousands of readers worldwide.",
    requirements: ["Strong editorial illustration portfolio", "Ability to capture political/cultural themes", "Fast turnaround on breaking news art", "Experience with digital illustration tools"],
  },
];

export default function CareersPage() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Careers at ${siteName} — Join Our Editorial Team`,
    description: `Work at ${siteName}. We're hiring writers, developers, social media managers, and illustrators. Remote-first, creative-first culture.`,
    keywords: "careers, jobs, writer, media jobs, remote jobs, editorial team",
    defaultTitle: siteName,
  });

  const [form, setForm] = useState({ name: "", email: "", position: "", portfolio: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success("Application submitted! We'll review it and get back to you.");
    setForm({ name: "", email: "", position: "", portfolio: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container text-center">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Join the {branding.siteName} Team
          </h1>
          <p className="text-lg opacity-60 max-w-2xl mx-auto leading-relaxed">
            Help us remaster the news. We're looking for talented writers, developers, and creatives who believe the world needs more laughter.
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

      {/* Why Work Here */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Why Work at {branding.siteName}?</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              We're building the future of {branding.genre} journalism. Here's what makes {branding.siteName} a great place to work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {perks.map((perk, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <perk.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{perk.title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  {perk.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="container py-14">
        <div className="text-center mb-10">
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Open Positions</h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
            Find the role that fits your skills and passion. All positions are remote-friendly.
          </p>
        </div>

        <div className="space-y-5 max-w-3xl mx-auto">
          {openPositions.map((pos, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <h3 className="font-headline text-xl font-bold">{pos.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{pos.department}</span>
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{pos.type}</span>
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{pos.location}</span>
                  </div>
                </div>
                <Briefcase className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />
              </div>
              <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
                {pos.description}
              </p>
              <ul className="space-y-1.5">
                {pos.requirements.map((r, j) => (
                  <li key={j} className="flex items-center gap-2 text-[14px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Application Form */}
      <section className="bg-muted/50 py-14">
        <div className="container max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Apply Now</h2>
            <p className="text-muted-foreground text-[15px] leading-relaxed">
              Don't see your perfect role? Send us your info anyway — we're always looking for exceptional talent.
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
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Position of Interest</label>
                  <select
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                  >
                    <option value="">Select a position</option>
                    {openPositions.map((pos, i) => (
                      <option key={i} value={pos.title}>{pos.title}</option>
                    ))}
                    <option value="other">Other / General Interest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Portfolio / Website</label>
                  <input
                    type="url"
                    value={form.portfolio}
                    onChange={e => setForm(f => ({ ...f, portfolio: e.target.value }))}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium mb-1.5">Tell Us About Yourself *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder={`Share your experience, what excites you about ${branding.siteName}, and why you'd be a great fit...`}
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors resize-none"
                  required
                />
              </div>

              <Button type="submit" className="w-full sm:w-auto px-8" disabled={sending}>
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Application</>
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
