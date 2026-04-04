import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center px-6">
        <h1 className="text-8xl font-bold text-teal-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800 mb-3">Page not found</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <Home className="w-4 h-4 mr-2" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
