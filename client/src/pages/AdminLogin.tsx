import { getLoginUrl } from "@/const";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLogin() {
  const handleLogin = () => {
    // Redirect to Manus OAuth — after login the owner is auto-promoted to admin
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/wb-icon.png" alt="Wilder Blueprint" className="w-20 h-20 rounded-full mb-4" />
          <h1 className="text-2xl font-bold font-headline tracking-tight">Wilder Blueprint</h1>
          <p className="text-muted-foreground text-sm mt-1">Admin Panel</p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-headline flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Admin Access
            </CardTitle>
            <CardDescription>
              Sign in with your Manus account to access the admin dashboard.
              Only the site owner has admin privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={handleLogin}
            >
              Sign in with Manus
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()} Wilder Blueprint. All rights reserved.
        </p>
      </div>
    </div>
  );
}
