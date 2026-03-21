import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface SettingsPageLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  children: React.ReactNode;
}

export default function SettingsPageLayout({
  title,
  description,
  icon,
  hasChanges,
  isSaving,
  onSave,
  children,
}: SettingsPageLayoutProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
            <p className="text-muted-foreground text-sm truncate">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasChanges && (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
              Unsaved changes
            </span>
          )}
          <Button onClick={onSave} disabled={!hasChanges || isSaving} className="shadow-sm whitespace-nowrap">
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save Settings
          </Button>
        </div>
      </div>
      {children}
    </>
  );
}
