import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Image, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function BatchWatermarkPanel() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [result, setResult] = useState<{ succeeded: number; failed: number; total: number } | null>(null);

  const { data: status } = trpc.settings.batchWatermarkStatus.useQuery();
  const batchWatermark = trpc.settings.batchWatermark.useMutation();

  const handleBatchWatermark = async (forceReprocess = false) => {
    console.log('[BatchWatermark] Button clicked, showing confirmation dialog');
    const batchSize = 20;
    const remaining = status?.articlesWithImages || 0;
    const willProcess = Math.min(batchSize, remaining);
    
    if (!confirm(`This will watermark ${willProcess} images (batch size: ${batchSize}). ${remaining > batchSize ? `You'll need to run this ${Math.ceil(remaining / batchSize)} times to process all ${remaining} images.` : ''} Continue?`)) {
      console.log('[BatchWatermark] User cancelled confirmation');
      return;
    }

    console.log('[BatchWatermark] User confirmed, starting batch watermark');
    setIsProcessing(true);
    setProgress(null);
    setResult(null);

    try {
      console.log('[BatchWatermark] Calling mutateAsync with dryRun=false, forceReprocess=', forceReprocess);
      const result = await batchWatermark.mutateAsync({ dryRun: false, forceReprocess });
      console.log('[BatchWatermark] Mutation completed:', result);
      setResult(result);
      
      if (result.failed === 0) {
        toast.success(`Successfully watermarked ${result.succeeded} images!`);
      } else {
        toast.warning(`Watermarked ${result.succeeded} images, ${result.failed} failed.`);
      }
    } catch (error) {
      console.error('[BatchWatermark] Mutation error:', error);
      toast.error(`Batch watermark failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log('[BatchWatermark] Finally block, setting isProcessing=false');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 p-4 rounded-md border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">Total Articles</p>
          </div>
          <p className="text-2xl font-bold">{status?.totalArticles || 0}</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-md border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">With Images</p>
          </div>
          <p className="text-2xl font-bold">{status?.articlesWithImages || 0}</p>
        </div>
      </div>

      {result && (
        <div className="bg-muted/50 p-4 rounded-md border border-border space-y-2">
          <div className="flex items-center gap-2">
            {result.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
            <p className="text-sm font-medium">Batch Process Complete</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">{result.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Succeeded</p>
              <p className="font-semibold text-green-600">{result.succeeded}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Failed</p>
              <p className="font-semibold text-red-600">{result.failed}</p>
            </div>
          </div>
        </div>
      )}

      {progress && (
        <div className="bg-muted/50 p-4 rounded-md border border-border">
          <p className="text-sm font-medium mb-2">Processing...</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {progress.current} / {progress.total} images
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={() => handleBatchWatermark(false)}
          disabled={isProcessing || !status?.articlesWithImages}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Image className="w-4 h-4 mr-2" />
              Watermark All Images
            </>
          )}
        </Button>
        <Button
          onClick={() => handleBatchWatermark(true)}
          disabled={isProcessing}
          variant="outline"
          title="Re-watermark all images (including already watermarked ones)"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Processes 20 images per batch to avoid timeouts. Run multiple times to watermark all images. 
        Each batch takes 1-2 minutes depending on image sizes.
      </p>
    </div>
  );
}
