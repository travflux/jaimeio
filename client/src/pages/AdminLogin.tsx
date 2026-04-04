import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Zap, Globe, Shield, BarChart3 } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      // Super admin always goes to Mission Control
      window.location.href = "/admin";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f2d5e 0%, #0f2d5edd 50%, #0f2d5e99 100%)" }}>
        <div className="relative z-10">
          <img src="/jaimeio-logo-light.png" alt="JAIME.IO" className="h-10 mb-2" />
          <p className="text-white/70 text-sm mt-1">AI-Powered Content Platform</p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold font-headline leading-tight">
            AI-Powered Content,<br />Automated.
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            The complete content automation platform for publishers, brands, and agencies.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Zap, label: "AI Generation", desc: "Automated content creation" },
              { icon: Globe, label: "Multi-Channel", desc: "Publish everywhere" },
              { icon: Shield, label: "Brand Safe", desc: "Quality controls built-in" },
              { icon: BarChart3, label: "Analytics", desc: "Real-time insights" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <Icon className="w-5 h-5 mb-2" />
                <p className="font-medium text-sm">{label}</p>
                <p className="text-white/60 text-xs">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/40 text-xs">
          &copy; {new Date().getFullYear()} JANICCO. All rights reserved.
        </p>

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full border border-white" />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            <img src="/jaimeio-logo-light.png" alt="JAIME.IO" className="h-10 mx-auto mb-2" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to access your platform
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1.5">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button className="w-full h-11 text-base font-medium" type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            &copy; {new Date().getFullYear()} JAIME.IO. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
