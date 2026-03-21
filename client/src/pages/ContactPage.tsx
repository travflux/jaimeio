import { useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, MapPin, Clock, Send, Loader2 } from "lucide-react";
import { usePageSEO } from "@/hooks/usePageSEO";

export default function ContactPage() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "";
  usePageSEO({
    title: `Contact ${siteName} — Get in Touch With Our Team`,
    description: `Reach out to the ${siteName} editorial team. Questions, tips, corrections, or advertising inquiries — we'd love to hear from you.`,
    keywords: "contact us, editorial contact, news tips, corrections, advertising inquiries",
    defaultTitle: siteName,
  });

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    // Simulate sending — in production this would hit a backend endpoint
    await new Promise(r => setTimeout(r, 1200));
    toast.success("Message sent! We'll get back to you soon.");
    setForm({ name: "", email: "", subject: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-foreground text-background py-16">
        <div className="container text-center">
          <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Get in Touch
          </h1>
          <p className="text-lg opacity-60 max-w-2xl mx-auto leading-relaxed">
            Have a tip, a correction, or just want to say hello? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="container py-16 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h2 className="font-headline text-2xl font-bold mb-6">Contact Information</h2>
              <p className="text-muted-foreground text-[15px] leading-relaxed mb-8">
                Whether you have a story lead, feedback on our coverage, or a general inquiry, our editorial team is ready to assist.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">Email</h3>
                  <a href={`mailto:${branding.editorEmail}`} className="text-[15px] text-primary hover:underline">
                    {branding.editorEmail}
                  </a>
                  <p className="text-[13px] text-muted-foreground mt-1">For editorial inquiries and tips</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">Location</h3>
                  <p className="text-[15px] text-muted-foreground">
                    1412 Valencia<br />
                    Tustin, CA 92782
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1">Our headquarters</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold mb-1">Response Time</h3>
                  <p className="text-[15px] text-muted-foreground">
                    Within 24–48 hours
                  </p>
                  <p className="text-[13px] text-muted-foreground mt-1">We read every message</p>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Follow Us</h3>
              <a
                href={branding.twitterUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[15px] text-foreground hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                {branding.twitterHandle}
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
              <h2 className="font-headline text-xl font-bold mb-2">Send Us a Message</h2>
              <p className="text-muted-foreground text-[14px] mb-6">
                All fields marked with * are required.
              </p>

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

                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="What's this about?"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium mb-1.5">Message *</label>
                  <textarea
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Tell us what's on your mind..."
                    rows={6}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-[15px] focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors resize-none"
                    required
                  />
                </div>

                <Button type="submit" className="w-full sm:w-auto px-8" disabled={sending}>
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Send Message</>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
