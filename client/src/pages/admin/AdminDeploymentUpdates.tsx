import AdminLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  RefreshCw, Download, CheckCircle, AlertCircle, Loader2, 
  Package, ArrowUp, Clock, Sparkles 
} from "lucide-react";

export default function AdminDeploymentUpdates() {
  const { data: statuses, isLoading, refetch } = trpc.deployments.updateStatuses.useQuery();
  const { data: currentVersion } = trpc.deployments.currentVersion.useQuery();
  const { data: versionHistory } = trpc.deployments.versionHistory.useQuery();

  const updateSingleMut = trpc.deployments.updateSingle.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Updated ${result.previousVersion} → ${result.newVersion}`);
        refetch();
      } else {
        toast.error(result.error || 'Update failed');
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const updateAllMut = trpc.deployments.updateAll.useMutation({
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (failed === 0) {
        toast.success(`Successfully updated ${successful} deployment${successful > 1 ? 's' : ''}!`);
      } else {
        toast.warning(`Updated ${successful}, failed ${failed}`);
      }
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUpdateSingle = (deploymentId: number) => {
    updateSingleMut.mutate({ deploymentId });
  };

  const handleUpdateAll = () => {
    const needsUpdate = statuses?.filter(s => s.updateAvailable).length || 0;
    if (needsUpdate === 0) {
      toast.info('All deployments are up to date');
      return;
    }

    const confirmed = window.confirm(
      `This will update ${needsUpdate} deployment${needsUpdate > 1 ? 's' : ''} to version ${currentVersion}. Continue?`
    );

    if (confirmed) {
      updateAllMut.mutate();
    }
  };

  const deploymentsNeedingUpdate = statuses?.filter(s => s.updateAvailable).length || 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Deployment Updates</h1>
            <p className="text-sm text-muted-foreground">
              Current Version: {currentVersion} • {deploymentsNeedingUpdate} deployment{deploymentsNeedingUpdate !== 1 ? 's' : ''} need{deploymentsNeedingUpdate === 1 ? 's' : ''} update
            </p>
          </div>
        </div>

        {deploymentsNeedingUpdate > 0 && (
          <Button
            onClick={handleUpdateAll}
            disabled={updateAllMut.isPending}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {updateAllMut.isPending ? 'Updating...' : `Update All (${deploymentsNeedingUpdate})`}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Version History */}
        {versionHistory && versionHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Version History
              </CardTitle>
              <CardDescription>
                Recent software releases and changelog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versionHistory.slice().reverse().map((version) => (
                  <div key={version.version} className="border-l-2 border-primary pl-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-lg">v{version.version}</span>
                      {version.version === currentVersion && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Current</span>
                      )}
                      {version.breaking && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Breaking</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Released: {new Date(version.releaseDate).toLocaleDateString()}
                    </div>
                    <ul className="text-sm space-y-1">
                      {version.changelog.map((change, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="w-3 h-3 mt-1 flex-shrink-0 text-primary" />
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deployment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Licensed Deployments
            </CardTitle>
            <CardDescription>
              Update status for all licensed client deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading deployment statuses...</span>
              </div>
            ) : statuses && statuses.length > 0 ? (
              <div className="space-y-3">
                {statuses.map((status) => (
                  <div
                    key={status.deploymentId}
                    className={`p-4 border rounded-lg ${
                      status.updateAvailable ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {status.updateAvailable ? (
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                          <span className="font-semibold truncate">{status.clientName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {status.domain}
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span>
                            Current: <span className="font-mono">{status.currentVersion}</span>
                          </span>
                          {status.updateAvailable && (
                            <>
                              <ArrowUp className="w-3 h-3" />
                              <span>
                                Latest: <span className="font-mono">{status.latestVersion}</span>
                              </span>
                            </>
                          )}
                        </div>
                        {status.updateAvailable && status.updates.length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {status.updates.length} update{status.updates.length > 1 ? 's' : ''} available
                          </div>
                        )}
                      </div>

                      {status.updateAvailable && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateSingle(status.deploymentId)}
                          disabled={updateSingleMut.isPending}
                          className="flex-shrink-0"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Update
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No licensed deployments found
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
