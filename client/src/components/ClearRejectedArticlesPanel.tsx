import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Trash2, AlertTriangle, CheckCircle } from "lucide-react";

export default function ClearRejectedArticlesPanel() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{ deleted: number; message: string } | null>(null);

  const { data: stats, refetch } = trpc.articles.stats.useQuery();
  const bulkDelete = trpc.articles.bulkDeleteRejected.useMutation();
  const utils = trpc.useUtils();

  const rejectedCount = stats?.rejected || 0;

  const handleBulkDelete = async () => {
    if (rejectedCount === 0) {
      toast.info("No rejected articles to delete");
      return;
    }

    if (!confirm(`This will permanently delete ${rejectedCount} rejected articles and their associated data. This action cannot be undone. Continue?`)) {
      return;
    }

    setIsDeleting(true);
    setResult(null);

    try {
      const result = await bulkDelete.mutateAsync();
      setResult(result);
      
      toast.success(result.message);
      
      // Refresh stats and article list
      await refetch();
      utils.articles.list.invalidate();
    } catch (error) {
      toast.error(`Failed to delete rejected articles: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-md border border-border">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="text-sm font-medium">Rejected Articles</p>
        </div>
        <p className="text-3xl font-bold">{rejectedCount}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Articles marked as rejected in the review queue
        </p>
      </div>

      {result && (
        <div className="bg-muted/50 p-4 rounded-md border border-border">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm font-medium">Deletion Complete</p>
          </div>
          <p className="text-sm">{result.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.deleted} articles and their associated social posts were permanently deleted.
          </p>
        </div>
      )}

      <Button
        onClick={handleBulkDelete}
        disabled={isDeleting || rejectedCount === 0}
        variant="destructive"
        className="w-full"
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete All Rejected Articles
          </>
        )}
      </Button>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
        <p className="text-xs text-yellow-800 dark:text-yellow-200">
          <strong>Warning:</strong> This action is permanent and cannot be undone. Rejected articles and their associated social posts will be permanently deleted from the database. Consider exporting data before deletion if needed.
        </p>
      </div>
    </div>
  );
}
