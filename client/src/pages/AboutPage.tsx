import { useBranding } from "@/hooks/useBranding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { InteractiveMascot } from "@/components/InteractiveHambry";
import { Feather, Shield, Zap, Eye, Award, BookOpen, Users, Newspaper } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function AboutPage() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  const genre = branding.genre || "news";
  const genreCapitalized = genre.charAt(0).toUpperCase() + genre.slice(1);

  usePageSEO({
    title: `About ${siteName} — Our Mission & Editorial Values`,
    description: `Learn about ${siteName}, our editorial mission, values, and the team behind our content. Sharp writing, editorial integrity, and purpose.`,
    keywords: "about us, editorial mission, news publication, editorial values",
    defaultTitle: siteName,
  });

  const values = [
    {
      icon: Feather,
      title: "Sharp Writing",
      description: "Every headline is honed, every paragraph polished. We believe great writing is a craft, not a shortcut.",
    },
    {
      icon: Shield,
      title: "Editorial Integrity",
      description: `${genreCapitalized} with standards. We report clearly, label accurately, and never fabricate to deceive — only to inform.`,
    },
    {
      icon: Zap,
      title: "Writing With Purpose",
      description: "Every article carries a point worth making. We write to inform, engage, and occasionally make you think twice.",
    },
    {
      icon: Eye,
      title: "Holding Power Accountable",
      description: "From Capitol Hill to Silicon Valley, no institution is too big to be examined honestly.",
    },
  ];

  const milestones = [
    { year: "2026", event: `Launches with a mission to remaster the news through ${genre}.` },
    { year: "2026", event: "Expands editorial team to cover breaking news and trending topics in real-time." },
    { year: "2026", event: "Reaches 100K monthly readers within the first quarter." },
    { year: "2026", event: "Expands to daily publication with coverage across 10+ categories." },
  ];

  const team = [
    {
      name: "The Writers",
      role: "Editorial Team",
      bio: `A talented group of journalists, editors, and writers who craft every headline and paragraph with precision and wit.`,
    },
    {
      name: "The Editors",
      role: "Quality Control",
      bio: "A small but mighty team of writers and editors who ensure every article meets our standards for accuracy, clarity, and taste.",
    },
    {
      name: "The Readers",
      role: "Our Community",
      bio: "Our most important collaborators. Your shares, comments, and raised eyebrows keep us honest and sharp.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-5xl mx-auto">
            <div className="flex-shrink-0">
              <InteractiveMascot 
                size="large"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Meet {branding.mascotName}
              </h1>
              <p className="text-lg opacity-80 leading-relaxed mb-4">
                The distinguished character behind the headlines. {branding.mascotName} embodies our mission: to remaster the news with style, substance, and a healthy dose of {genre}.
              </p>
              <p className="text-base opacity-60 leading-relaxed">
                The news, remastered. We take the day's headlines and return them to you sharper, more honest, and more engaging than the originals ever dared to be.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container py-14">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Newspaper className="w-5 h-5" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.15em]">Our Mission</span>
          </div>
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-5">
            {genreCapitalized} That Informs as Much as It Engages
          </h2>
          <p className="text-[16px] text-muted-foreground leading-relaxed mb-4">
            {siteName} was born from a simple observation: the news deserves better writers. We take real events, strip away the spin, and rebuild them with the clarity and perspective that quality {genre} can provide.
          </p>
          <p className="text-[16px] text-muted-foreground leading-relaxed">
            Every article on {siteName} is clearly labeled as {genre}. We are not in the business of misinformation — we are in the business of making you think, engage, and see the world a little differently. Our talented team of writers and editors works around the clock to ensure we publish daily without sacrificing quality.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">What We Stand For</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              Four principles that guide every headline we write and every article we publish.
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
            A streamlined editorial process powered by our talented writing team, running every day.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">1</div>
              <h3 className="font-semibold mb-2">Gather</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Our pipeline scans top news sources every morning, collecting the day's most newsworthy stories.
              </p>
            </div>
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">2</div>
              <h3 className="font-semibold mb-2">Remaster</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Our writers craft articles complete with headlines, illustrations, and social posts — all grounded in the real story.
              </p>
            </div>
            <div className="relative bg-card border border-border rounded-xl p-6 shadow-sm text-center">
              <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">3</div>
              <h3 className="font-semibold mb-2">Publish</h3>
              <p className="text-[14px] text-muted-foreground leading-relaxed">
                Editors review, refine, and approve. The best articles go live on the site and across our social channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-muted/50 py-14">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">The Team</h2>
            <p className="text-muted-foreground text-[15px] max-w-xl mx-auto leading-relaxed">
              {siteName} is built by a small team that punches well above its weight class.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {team.map((member, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  {i === 0 ? <BookOpen className="w-7 h-7 text-primary" /> :
                   i === 1 ? <Award className="w-7 h-7 text-primary" /> :
                   <Users className="w-7 h-7 text-primary" />}
                </div>
                <h3 className="font-headline text-lg font-bold text-center mb-1">{member.name}</h3>
                <p className="text-[13px] text-primary font-medium text-center mb-3">{member.role}</p>
                <p className="text-[14px] text-muted-foreground leading-relaxed text-center">{member.bio}</p>
              </div>
            ))}
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
          <h2 className="font-headline text-3xl font-bold tracking-tight mb-3">Join the Conversation</h2>
          <p className="text-[15px] opacity-60 max-w-xl mx-auto leading-relaxed mb-6">
            Follow us on social media, subscribe to our newsletter, or just keep reading. The best {genre} is the kind that finds you.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/contact" className="inline-flex items-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-[15px] hover:opacity-90 transition-opacity">
              Get in Touch
            </a>
            <a href="/careers" className="inline-flex items-center px-6 py-2.5 rounded-lg border border-background/20 text-background font-medium text-[15px] hover:bg-background/10 transition-colors">
              Join the Team
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
