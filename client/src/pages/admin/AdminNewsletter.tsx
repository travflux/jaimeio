import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, Users, UserX, Send, Loader2, AlertCircle, CheckCircle2, FlaskConical, History,
} from "lucide-react";

export default function AdminNewsletter() {
  const { data: subscribers } = trpc.newsletter.list.useQuery();
  const active = subscribers?.filter(s => s.status === "active") ?? [];
  const unsubscribed = subscribers?.filter(s => s.status === "unsubscribed") ?? [];

  const [digestResult, setDigestResult] = useState<{ sent: number; skipped: number; errors: number; reason?: string } | null>(null);
  const sendDigest = trpc.newsletter.sendDigest.useMutation({
    onSuccess: (r) => setDigestResult(r),
    onError: (e: { message: string }) => setDigestResult({ sent: 0, skipped: 0, errors: 1, reason: e.message }),
  });
  const sendDryRun = trpc.newsletter.sendDigest.useMutation({
    onSuccess: (r) => setDigestResult(r),
    onError: (e: { message: string }) => setDigestResult({ sent: 0, skipped: 0, errors: 1, reason: e.message }),
  });

  // Test Connection
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const testConn = trpc.newsletter.testConnection.useMutation({
    onSuccess: (r) => setTestResult({
      success: r.success,
      message: r.success
        ? `✅ Test email sent${r.messageId ? ` (ID: ${r.messageId})` : ""}. Check your inbox.`
        : `❌ ${r.error ?? "Failed to send test email"}`,
    }),
    onError: (e: { message: string }) => setTestResult({ success: false, message: `❌ ${e.message}` }),
  });

  const { data: sendHistory } = trpc.newsletter.sendHistory.useQuery();

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground text-sm">Manage newsletter subscribers and digest delivery.</p>
        </div>
      </div>

      <Tabs defaultValue="digest">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="digest">Weekly Digest</TabsTrigger>
          <TabsTrigger value="test">Test Connection</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="history">Send History</TabsTrigger>
        </TabsList>

        {/* ── Weekly Digest tab ── */}
        <TabsContent value="digest">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">Active Subscribers</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{active.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <UserX className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Unsubscribed</span>
                </div>
                <p className="text-3xl font-bold text-muted-foreground">{unsubscribed.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="w-4 h-4" />Weekly Digest
                </CardTitle>
                <Badge variant="outline" className="text-xs">Sundays 10am ET</Badge>
              </div>
              <CardDescription className="text-xs">
                Sends the top 10 articles from the past week to all active subscribers.
                Requires a Resend API key — use the Test Connection tab to verify delivery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {digestResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm ${
                  digestResult.reason ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                }`}>
                  {digestResult.reason ? <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  <span>
                    {digestResult.reason
                      ? `Skipped: ${digestResult.reason}`
                      : `Sent to ${digestResult.sent} subscriber${digestResult.sent !== 1 ? "s" : ""}${digestResult.errors ? `, ${digestResult.errors} error${digestResult.errors !== 1 ? "s" : ""}` : ""}`
                    }
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => sendDigest.mutate({ dryRun: false })}
                  disabled={sendDigest.isPending || sendDryRun.isPending}
                >
                  {sendDigest.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                  Send Now
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendDryRun.mutate({ dryRun: true })}
                  disabled={sendDigest.isPending || sendDryRun.isPending}
                >
                  {sendDryRun.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Dry Run
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Test Connection tab ── */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />Test Resend Connection
              </CardTitle>
              <CardDescription className="text-xs">
                Sends a real test email via Resend to confirm your API key is valid and email delivery is working.
                The email will arrive from your configured "From" address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 max-w-sm">
                <Label className="text-xs">Send test email to</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Enter your own email address. The test email will arrive within a few seconds if Resend is configured correctly.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => { setTestResult(null); testConn.mutate({ toEmail: testEmail }); }}
                disabled={!testEmail || testConn.isPending}
              >
                {testConn.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                {testConn.isPending ? "Sending…" : "Send Test Email"}
              </Button>
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"}`}>
                  {testResult.message}
                </div>
              )}
              <div className="p-3 bg-muted/40 rounded-md text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Where do I find my Resend API key?</p>
                <p>1. Go to <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="underline">resend.com</a> and sign in.</p>
                <p>2. Navigate to <strong>API Keys</strong> in the left sidebar.</p>
                <p>3. Click <strong>Create API Key</strong> and copy the key.</p>
                <p>4. Add it in <strong>Settings → Social & Email → Resend API Key</strong>.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscribers tab ── */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader className="pb-3 border-b border-border bg-muted/30">
              <CardTitle className="text-base">All Subscribers ({subscribers?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers?.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">{s.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${
                          s.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}>
                          {s.status === "active" && (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-500" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                          )}
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {(!subscribers || subscribers.length === 0) && (
                    <tr><td colSpan={3} className="py-12 text-center">
                      <Mail className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">No subscribers yet.</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Subscribers will appear here when readers sign up.</p>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Send History tab ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />Send History
              </CardTitle>
              <CardDescription className="text-xs">Record of all digest sends, including dry runs.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!sendHistory?.length ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No sends recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Type</th>
                        <th className="text-left p-3 font-medium">Recipients</th>
                        <th className="text-left p-3 font-medium">Sent</th>
                        <th className="text-left p-3 font-medium">Failed</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Subject</th>
                        <th className="text-left p-3 font-medium hidden md:table-cell">Triggered By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sendHistory.map((h: any) => (
                        <tr key={h.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="p-3 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge variant={h.isDryRun ? "outline" : "default"} className="text-xs">
                              {h.isDryRun ? "Dry Run" : "Live"}
                            </Badge>
                          </td>
                          <td className="p-3">{h.recipientCount}</td>
                          <td className="p-3 text-green-600 font-medium">{h.successCount}</td>
                          <td className="p-3 text-red-600">{h.failCount}</td>
                          <td className="p-3 hidden md:table-cell text-xs text-muted-foreground max-w-xs truncate">{h.subject}</td>
                          <td className="p-3 hidden md:table-cell text-xs text-muted-foreground capitalize">{h.triggeredBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
