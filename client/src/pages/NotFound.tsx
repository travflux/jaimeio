import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { InteractiveMascot } from "@/components/InteractiveHambry";
import { useBranding } from "@/hooks/useBranding";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { branding } = useBranding();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="w-full max-w-2xl mx-4 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <InteractiveMascot 
                size="medium"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-5xl font-bold text-slate-900 mb-2">404</h1>
              <h2 className="text-2xl font-semibold text-slate-700 mb-4">
                Even {branding.mascotName} Can't Find This Page
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                And trust me, he's looked everywhere — under the headlines, behind the bylines, even in the satirical footnotes. This page either doesn't exist, or it's hiding from us.
              </p>
              <p className="text-sm text-slate-500 mb-8 italic">
                "I've covered breaking news, but this page is just broken." — {branding.mascotName}
              </p>

              <div
                id="not-found-button-group"
                className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start"
              >
                <Button
                  onClick={handleGoHome}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Return to Homepage
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
