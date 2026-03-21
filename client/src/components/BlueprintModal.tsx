import { useState, useEffect } from "react";
import { X, ArrowRight, Mail } from "lucide-react";
import { getAdMessage } from "@/lib/adMessaging";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface BlueprintModalProps {
  categorySlug?: string;
  trigger?: "timed" | "exit-intent" | "manual";
  delayMs?: number;
  onClose?: () => void;
}

export function BlueprintModal({
  categorySlug,
  trigger = "timed",
  delayMs = 20000,
  onClose,
}: BlueprintModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const ad = getAdMessage(categorySlug);
  const subscribe = trpc.newsletter.subscribe.useMutation();

  // Timed trigger - show only once per session
  useEffect(() => {
    if (trigger !== "timed") return;

    // Check if modal has already been shown in this session
    const sessionKey = "blueprint-modal-shown";
    const hasShown = sessionStorage.getItem(sessionKey);

    if (hasShown) {
      return; // Don't show again in this session
    }

    const timer = setTimeout(() => {
      setIsOpen(true);
      // Mark that we've shown the modal in this session
      sessionStorage.setItem(sessionKey, "true");
    }, delayMs);

    return () => clearTimeout(timer);
  }, [trigger, delayMs]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribe.mutateAsync({ email });
      toast.success("Subscribed! Check your inbox.");
      setEmail("");
      handleClose();
    } catch (error) {
      toast.error("Failed to subscribe. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary mb-2">
              Exclusive Offer
            </p>
            <h2 className="font-headline text-2xl font-bold text-foreground leading-tight">
              {ad.emailHeadline || ad.headline}
            </h2>
          </div>

          {/* Description */}
          <p className="text-[15px] text-muted-foreground leading-relaxed mb-6">
            {ad.emailDescription || ad.description}
          </p>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? "Subscribing..." : (
                <>
                  Subscribe
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Or Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">or</span>
            </div>
          </div>

          {/* Direct CTA */}
          <a
            href={ad.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-3 rounded-lg border border-primary text-primary font-semibold text-[15px] hover:bg-primary/5 transition-colors text-center group"
          >
            {ad.cta}
            <ArrowRight className="w-4 h-4 inline-block ml-2 group-hover:translate-x-0.5 transition-transform" />
          </a>

          {/* Footer */}
          <p className="text-[12px] text-muted-foreground text-center mt-5">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
