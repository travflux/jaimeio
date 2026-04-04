import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Plus, RefreshCw, Trash2, CheckCircle2, AlertCircle, Clock, Info } from "lucide-react";

export default function AdminDomains() {
  const [showAdd, setShowAdd] = useState(false);
  const [clientId, setClientId] = useState("");
  const [domain, setDomain] = useState("");
  const [pubName, setPubName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [addError, setAddError] = useState("");

  const utils = trpc.useUtils();
  const domainsQuery = trpc.domains.list.useQuery();
  const registerMutation = trpc.domains.register.useMutation({
    onSuccess: () => {
      utils.domains.list.invalidate();
      setShowAdd(false);
      setClientId("");
      setDomain("");
      setPubName("");
      setNotifyEmail("");
      setAddError("");
    },
    onError: (err) => setAddError(err.message),
  });
  const verifyMutation = trpc.domains.verify.useMutation({
    onSuccess: () => utils.domains.list.invalidate(),
  });
  const deleteMutation = trpc.domains.delete.useMutation({
    onSuccess: () => utils.domains.list.invalidate(),
  });

  const domains = domainsQuery.data ?? [];

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <AlertCircle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Client Domains</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage custom domains for white-label client publications
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Domain
        </Button>
      </div>

      {/* DNS Instructions */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                Client DNS Setup Instructions
              </p>
              <p className="text-blue-800 dark:text-blue-400">
                Each client must add a <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-mono">CNAME</code> record
                pointing their domain to:
              </p>
              <code className="block mt-2 px-3 py-2 bg-white dark:bg-slate-900 rounded border text-sm font-mono">
                publications.getjaime.io
              </code>
              <p className="mt-2 text-blue-700 dark:text-blue-500 text-xs">
                If the client uses Cloudflare, they must set proxy status to DNS only (grey cloud).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Domain Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Register Client Domain
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setAddError("");
                  registerMutation.mutate({
                    clientId,
                    domain,
                    publicationName: pubName,
                    notifyEmail: notifyEmail || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-medium block mb-1">Client Name / ID</label>
                  <input
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                    placeholder="acme-news"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Custom Domain</label>
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                    placeholder="news.theirclient.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Publication Name</label>
                  <input
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                    placeholder="The Acme Times"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">
                    Client Email <span className="text-muted-foreground font-normal">(optional — sends DNS instructions)</span>
                  </label>
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background text-foreground text-sm"
                    placeholder="client@example.com"
                  />
                </div>
                {addError && <p className="text-sm text-destructive">{addError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? "Registering..." : "Register Domain"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domains Table */}
      <Card>
        <CardContent className="p-0">
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Globe className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No domains registered</p>
              <p className="text-sm">Click "Add Domain" to register a client domain.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Domain</th>
                    <th className="text-left px-4 py-3 font-medium">Client</th>
                    <th className="text-left px-4 py-3 font-medium">Publication</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Verified</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d: any) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{d.customDomain}</td>
                      <td className="px-4 py-3">{d.clientId}</td>
                      <td className="px-4 py-3">{d.publicationName}</td>
                      <td className="px-4 py-3">{statusBadge(d.sslStatus)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {d.verifiedAt
                          ? new Date(d.verifiedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verifyMutation.mutate({ domain: d.customDomain })}
                            disabled={verifyMutation.isPending}
                          >
                            <RefreshCw className={`w-3 h-3 mr-1 ${verifyMutation.isPending ? "animate-spin" : ""}`} />
                            Verify DNS
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete domain ${d.customDomain}?`))
                                deleteMutation.mutate({ id: d.id });
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
