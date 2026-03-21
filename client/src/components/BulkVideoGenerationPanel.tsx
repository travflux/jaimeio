import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Video, CheckCircle, AlertCircle } from "lucide-react";

interface BulkVideoGenerationPanelProps {
  utils: ReturnType<typeof trpc.useUtils>;
}

export default function BulkVideoGenerationPanel({ utils }: BulkVideoGenerationPanelProps) {
  const { data: stats } = trpc.articles.videoStats.useQuery();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [results, setResults] = useState<Array<{ articleId: number; success: boolean; videoUrl?: string; error?: string }> | null>(null);

  const bulkGenerate = trpc.articles.bulkGenerateVideos.useMutation({
    onSuccess: (data) => {
      setIsGenerating(false);
      setProgress(null);
      setResults(data.results);
      
      if (data.videosGenerated > 0) {
        toast.success(`Generated ${data.videosGenerated} videos successfully!`);
      }
      if (data.videosFailed > 0) {
        toast.error(`${data.videosFailed} videos failed to generate.`);
      }
      
      utils.articles.videoStats.invalidate();
    },
    onError: (error) => {
      setIsGenerating(false);
      setProgress(null);
      toast.error(`Bulk generation failed: ${error.message}`);
    },
  });

  const handleBulkGenerate = async () => {
    if (!stats || stats.articlesWithoutVideos === 0) {
      toast.info("All articles already have videos!");
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: stats.articlesWithoutVideos });
    setResults(null);
    
    bulkGenerate.mutate({});
  };

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Videos Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats?.videosGenerated ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{stats?.successRate ?? 0}% success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Without Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{stats?.articlesWithoutVideos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Ready for generation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats?.recentVideosGenerated ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Generated this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" /> Bulk Video Generation
          </CardTitle>
          <CardDescription>
            Generate videos for all articles that don't have one yet. This may take several minutes depending on the number of articles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGenerating && progress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generating videos...</span>
                <span className="text-sm text-muted-foreground">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-sm">Generation Complete</p>
                  <p className="text-xs text-muted-foreground">
                    {results.filter(r => r.success).length} succeeded, {results.filter(r => !r.success).length} failed
                  </p>
                </div>
              </div>

              {results.filter(r => !r.success).length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  <p className="text-sm font-medium text-amber-700">Failed Videos:</p>
                  {results.filter(r => !r.success).map((result) => (
                    <div key={result.articleId} className="text-xs p-2 bg-amber-50 rounded border border-amber-200">
                      <p>Article #{result.articleId}: {result.error}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleBulkGenerate}
            disabled={isGenerating || !stats || stats.articlesWithoutVideos === 0}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Videos...
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Generate Videos for {stats?.articlesWithoutVideos ?? 0} Articles
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            This operation will generate videos for all articles without one. Depending on your settings and the number of articles, this may take 5-30 minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
