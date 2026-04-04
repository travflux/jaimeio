import { useBranding } from "@/hooks/useBranding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Zap, Shield, BarChart2, Globe, Award, BookOpen, Users, Cpu } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function AboutPage() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "JAIME.IO";

  usePageSEO({
    title: `About ${siteName} — AI-Powered Content Platform`,
    description: `Learn about ${siteName}, the AI content engine that writes, optimizes, and publishes content across every channel so you can focus on growing.`,
    keywords: "about us, AI content platform, content automation, B2B SaaS",
    defaultTitle: siteName,
  });

  const values = [
    {
      icon: Zap,
      title: "Automated at Scale",
      description: "Our AI engine generates, optimizes, and publishes content around the clock — no manual intervention required.",
    },
    {
      icon: Shield,
      title: "Quality Assured",
      description: "Every article goes through automated quality checks, SEO optimization, and editorial review before publishing.",
    },
    {
      icon: BarChart2,
      title: "Data-Driven",
      description: "Content decisions are powered by real-time analytics, trending topics, and audience engagement signals.",
    },
    {
      icon: Globe,
      title: "Multi-Channel Distribution",
      description: "Publish to your website, social media, newsletters, and SMS — all from a single platform.",
    },
  ];

  const milestones = [
    { year: "2026", event: "JAIME.IO launches as an AI-powered content automation platform for businesses and agencies." },
    { year: "2026", event: "White-label support added — agencies can deploy branded instances for their clients." },
    { year: "2026", event: "Multi-channel distribution: website, X, newsletter, SMS, and more from one dashboard." },
    { year: "2026", event: "Custom domain routing and enterprise features for scaling content operations." },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
              The AI Content Engine for Modern Businesses
            </h1>
            <p className="text-lg opacity-80 leading-relaxed mb-4">
              We built {siteName} to give businesses and agencies the power of a full content team — automated. Our AI engine writes, optimizes, and publishes content across every channel so you can focus on growing.
            </p>
            <p className="text-base opacity-60 leading-relaxed">
              From article generation to SEO optimization to multi-channel distribution, {siteName} handles the entire content lifecycle.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Cpu className="w-5 h-5" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.15em]">Our Mission</span>
          </div>
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-5">
            Content That Works as Hard as You Do
          </h2>
          <p className="text-[16px] text-muted-foreground leading-relaxed mb-4">
            {siteName} was built from a simple insight: businesses need consistent, high-quality content but rarely have the resources to produce it at scale. Our platform bridges that gap with AI that understands your brand, your audience, and your goals.
          </p>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            Every piece of content is generated with SEO best practices, distributed across your channels, and tracked for performance — giving you a complete content operation without the overhead.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">What Sets Us Apart</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              Four principles that guide how we build and deliver.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
                <v.icon className="w-8 h-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{v.title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container py-14">
        <div className="text-center mb-10">
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">How {siteName} Works</h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
            A fully automated content pipeline — from source to publish.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Gather</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Our engine scans RSS feeds, Google News, X, Reddit, and YouTube to find the most relevant stories for your audience.
              </p>
            </div>
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Generate</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                AI writes SEO-optimized articles with headlines, images, social posts, and newsletter content — all in your brand voice.
              </p>
            </div>
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Distribute</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Content publishes to your website and distributes across X, newsletters, SMS, and more — automatically on your schedule.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Built by JANICCO</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              {siteName} is a product of JANICCO — a software company focused on AI-powered business tools.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <BookOpen className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-headline text-lg font-bold text-center mb-1">The Platform</h3>
              <p className="text-[13px] text-primary font-medium text-center mb-3">AI Content Engine</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed text-center">Full-stack content automation — from source gathering to multi-channel distribution.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Award className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-headline text-lg font-bold text-center mb-1">White Label</h3>
              <p className="text-[13px] text-primary font-medium text-center mb-3">For Agencies</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed text-center">Deploy branded content platforms for your clients with custom domains, branding, and settings.</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-headline text-lg font-bold text-center mb-1">Our Clients</h3>
              <p className="text-[13px] text-primary font-medium text-center mb-3">Growing Fast</p>
              <p className="text-[14px] text-muted-foreground leading-relaxed text-center">Businesses and agencies trust {siteName} to power their content operations at scale.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="container py-14">
        <div className="text-center mb-10">
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Our Story</h2>
          <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
            We are just getting started — but we are moving fast.
          </p>
        </div>
        <div className="max-w-2xl mx-auto space-y-0">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-5 pb-8 last:pb-0">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1.5" />
                {i < milestones.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
              </div>
              <div>
                <span className="text-[13px] font-semibold text-primary">{m.year}</span>
                <p className="text-[15px] text-muted-foreground leading-relaxed mt-0.5">{m.event}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-foreground text-background py-14">
        <div className="container text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Ready to Automate Your Content?</h2>
          <p className="text-[15px] opacity-60 max-w-xl mx-auto leading-relaxed mb-6">
            Get started with {siteName} and let AI handle your content pipeline — from creation to distribution.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/contact" className="inline-flex items-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-[15px] hover:opacity-90 transition-opacity">
              Get in Touch
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
