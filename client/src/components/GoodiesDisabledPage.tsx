import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

interface GoodiesDisabledPageProps {
  /** Name of the feature that is disabled, e.g. "Horoscopes" */
  feature: string;
}

/**
 * Shown when a visitor navigates to a goodies page that has been disabled
 * via the Setup Wizard toggle. Renders a friendly "not available" message
 * instead of a broken or empty page.
 */
export default function GoodiesDisabledPage({ feature }: GoodiesDisabledPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-headline font-bold mb-3">{feature} Not Available</h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            This feature is not currently enabled on this site. Check back later or explore our latest articles.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
