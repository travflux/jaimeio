import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Globe, Zap, Shield, BarChart3 } from "lucide-react";

/**
 * Tenant login page — displayed on subdomain URLs (e.g. wilderblueprint.getjaime.io)
 * Auto-resolves the license from the current hostname.
 */
export default function TenantLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Resolve license from hostname via tRPC
  const hostname = window.location.hostname;
  const licenseQuery = trpc.tenantAuth.resolveLicense.useQuery(
    { hostname },
    { retry: false, refetchOnWindowFocus: false }
  );

  const license = licenseQuery.data;

  const loginMutation = trpc.tenantAuth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/admin/dashboard";
    },
    onError: (err) => {
      setError(err.message || "Login failed");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!license) return;
    setError("");
    loginMutation.mutate({ email, password, licenseId: license.id });
  };

  const accentColor = license?.primaryColor || "#0f2d5e";
  const licenseName = license?.clientName || "Publication";

  if (licenseQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!license) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h1 className="text-xl font-bold font-headline">Publication Not Found</h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-md">
            No publication is configured for <strong>{hostname}</strong>.
            <br />Please check the URL or contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}dd 50%, ${accentColor}99 100%)` }}
      >
        <div className="relative z-10">
          {license.logoUrl ? (
            <img src={license.logoUrl} alt={licenseName} className="h-10 mb-2" />
          ) : (
            <h1 className="text-3xl font-bold font-headline">{licenseName}</h1>
          )}
          <p className="text-white/70 text-sm mt-1">Welcome to your publication portal</p>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-bold font-headline leading-tight">
            AI-Powered Content,<br />Automated.
          </h2>
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

        <p className="relative z-10 text-white/50 text-xs">{hostname} &mdash; Powered by JAIME.IO</p>

        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-20 left-10 w-96 h-96 rounded-full border border-white" />
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden text-center">
            {license.logoUrl ? (
              <img src={license.logoUrl} alt={licenseName} className="h-10 mx-auto mb-2" />
            ) : (
              <h1 className="text-2xl font-bold font-headline">{licenseName}</h1>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold font-headline">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your {licenseName} account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium block mb-1.5">Email</label>
              <input
                id="email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="you@company.com" required autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1.5">Password</label>
              <input
                id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Enter your password" required autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button className="w-full h-11 text-base font-medium" type="submit"
              disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            &copy; {new Date().getFullYear()} Powered by JAIME.IO
          </p>
        </div>
      </div>
    </div>
  );
}
