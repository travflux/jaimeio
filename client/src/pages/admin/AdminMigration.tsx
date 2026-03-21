import AdminLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Database, Play, Eye, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export default function AdminMigration() {
  const [showResults, setShowResults] = useState(false);

  const { data: preview, isLoading: previewLoading } = trpc.articles.previewMigration.useQuery();
  
  const migrateMut = trpc.articles.migrateJson.useMutation({
    onSuccess: (data) => {
      setShowResults(true);
      if (data.updatedCount > 0) {
        toast.success(`Successfully migrated ${data.updatedCount} articles!`);
      } else if (data.jsonArticles === 0) {
        toast.info('No articles needed migration.');
      } else {
        toast.warning(`Migration completed with ${data.failedCount} failures.`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleMigrate = () => {
    if (!preview || preview.articlesNeedingMigration.length === 0) {
      toast.info('No articles need migration.');
      return;
    }

    const confirmed = window.confirm(
      `This will migrate ${preview.articlesNeedingMigration.length} articles with JSON bodies. Continue?`
    );

    if (confirmed) {
      migrateMut.mutate();
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Article Migration</h1>
          <p className="text-sm text-muted-foreground">Bulk parse JSON article bodies</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Migration Preview
            </CardTitle>
            <CardDescription>
              Articles that will be migrated from JSON format to HTML
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scanning articles...</span>
              </div>
            ) : preview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{preview.totalArticles}</div>
                    <div className="text-sm text-muted-foreground">Total Articles</div>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">
                      {preview.articlesNeedingMigration.length}
                    </div>
                    <div className="text-sm text-amber-700">Need Migration</div>
                  </div>
                </div>

                {preview.articlesNeedingMigration.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Articles with JSON Bodies:</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {preview.articlesNeedingMigration.map((article) => (
                        <div key={article.id} className="p-3 border rounded-lg bg-background">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{article.headline}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                ID: {article.id} • Status: {article.status}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                                {article.bodyPreview}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleMigrate}
                  disabled={migrateMut.isPending || preview.articlesNeedingMigration.length === 0}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {migrateMut.isPending ? 'Migrating...' : `Migrate ${preview.articlesNeedingMigration.length} Articles`}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Results Card */}
        {showResults && migrateMut.data && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Migration Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-700">
                      {migrateMut.data.updatedCount}
                    </div>
                    <div className="text-sm text-green-700">Successfully Updated</div>
                  </div>
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">
                      {migrateMut.data.failedCount}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{migrateMut.data.jsonArticles}</div>
                    <div className="text-sm text-muted-foreground">Total Processed</div>
                  </div>
                </div>

                {migrateMut.data.details.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Details:</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {migrateMut.data.details.map((detail) => (
                        <div
                          key={detail.id}
                          className={`p-3 border rounded-lg ${
                            detail.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {detail.success ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{detail.headline}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                ID: {detail.id} • Status: {detail.status}
                              </div>
                              {detail.error && (
                                <div className="text-xs text-red-600 mt-1">{detail.error}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning Card */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold text-amber-900">Important Notes:</p>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>This migration parses JSON bodies and converts them to HTML format</li>
                  <li>The migration is irreversible - make sure to backup your database first</li>
                  <li>Articles already in HTML format will not be affected</li>
                  <li>The migration runs on the production database</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
