import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  MessageSquare, Users, Send, Settings, Plus, Trash2,
  CheckCircle, XCircle, AlertCircle, RefreshCw, Phone,
  Upload, Eye
} from "lucide-react";

// ─── Subscribers Tab ─────────────────────────────────────────────────────────

function SubscribersTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "opted_out" | "invalid" | "blocked">("all");
  const [newPhone, setNewPhone] = useState("");
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const { data: stats } = trpc.sms.getStats.useQuery();
  const { data, refetch } = trpc.sms.listSubscribers.useQuery({ page: 1, limit: 100, status: statusFilter });
  const addMutation = trpc.sms.addSubscriber.useMutation({
    onSuccess: () => { toast.success("Subscriber added"); setNewPhone(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const removeMutation = trpc.sms.removeSubscriber.useMutation({
    onSuccess: () => { toast.success("Subscriber opted out"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const importMutation = trpc.sms.importSubscribers.useMutation({
    onSuccess: (r) => { toast.success(`Imported: ${r.added} added, ${r.skipped} skipped, ${r.failed} failed`); setImportText(""); setShowImport(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (data?.subscribers ?? []).filter(s =>
    !search || s.phone.includes(search)
  );

  const statusColor: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    opted_out: "bg-gray-100 text-gray-600",
    invalid: "bg-red-100 text-red-800",
    blocked: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Users },
          { label: "Active", value: stats?.active ?? 0, icon: CheckCircle, color: "text-green-600" },
          { label: "Opted Out", value: stats?.optedOut ?? 0, icon: XCircle, color: "text-gray-500" },
          { label: "Invalid", value: stats?.invalid ?? 0, icon: AlertCircle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-3">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add subscriber */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add Subscriber</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="+1 (555) 000-0000"
              value={newPhone}
              onChange={e => setNewPhone(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={() => addMutation.mutate({ phone: newPhone })} disabled={!newPhone || addMutation.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowImport(!showImport)}>
              <Upload className="h-4 w-4 mr-1" /> Import CSV
            </Button>
          </div>
          {showImport && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="One phone number per line: +15551234567"
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={4}
              />
              <Button size="sm" onClick={() => importMutation.mutate({ phones: importText.split("\n").filter(Boolean) })} disabled={!importText || importMutation.isPending}>
                Import {importText.split("\n").filter(Boolean).length} numbers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter + list */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Search phone..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="border rounded px-2 py-1 text-sm bg-background"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="opted_out">Opted Out</option>
              <option value="invalid">Invalid</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No subscribers found</p>
          ) : (
            <div className="divide-y">
              {filtered.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-mono">{sub.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.optInSource ?? "unknown source"} · {sub.totalSent ?? 0} sent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[sub.status]}`}>{sub.status}</span>
                    {sub.status === "active" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMutation.mutate({ id: sub.id })}>
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Compose Tab ─────────────────────────────────────────────────────────────

function ComposeTab() {
  const [message, setMessage] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [respectQuietHours, setRespectQuietHours] = useState(true);
  const [result, setResult] = useState<any>(null);

  const { data: stats } = trpc.sms.getStats.useQuery();
  const sendMutation = trpc.sms.sendBroadcast.useMutation({
    onSuccess: (r) => {
      setResult(r);
      if (!dryRun) toast.success(`Broadcast sent: ${r.sent} delivered, ${r.failed} failed`);
      else toast.success(`Dry run: would send to ${r.sent} subscribers`);
    },
    onError: (e) => toast.error(e.message),
  });

  const charCount = message.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose Broadcast</CardTitle>
          <CardDescription>
            Send to {stats?.active ?? 0} active subscribers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Message</Label>
            <Textarea
              placeholder="Your SMS message here..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {charCount}/160 chars · {segments} segment{segments !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={dryRun} onCheckedChange={setDryRun} id="dry-run" />
              <Label htmlFor="dry-run" className="text-sm">Dry run (no actual sends)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={respectQuietHours} onCheckedChange={setRespectQuietHours} id="quiet-hours" />
              <Label htmlFor="quiet-hours" className="text-sm">Respect quiet hours (9pm–9am ET)</Label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => sendMutation.mutate({ message, dryRun: true, respectQuietHours })}
              variant="outline"
              disabled={!message || sendMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button
              onClick={() => sendMutation.mutate({ message, dryRun, respectQuietHours })}
              disabled={!message || sendMutation.isPending}
              className={dryRun ? "" : "bg-red-600 hover:bg-red-700"}
            >
              <Send className="h-4 w-4 mr-1" />
              {dryRun ? "Dry Run" : `Send to ${stats?.active ?? 0} subscribers`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Broadcast Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold text-green-600">{result.sent}</p><p className="text-xs text-muted-foreground">Sent</p></div>
              <div><p className="text-2xl font-bold text-red-500">{result.failed}</p><p className="text-xs text-muted-foreground">Failed</p></div>
              <div><p className="text-2xl font-bold text-gray-500">{result.skipped}</p><p className="text-xs text-muted-foreground">Skipped</p></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const { data: settings, refetch } = trpc.sms.getSettings.useQuery();
  const saveMutation = trpc.sms.saveSettings.useMutation({
    onSuccess: () => { toast.success("Twilio credentials saved"); setAccountSid(""); setAuthToken(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const testMutation = trpc.sms.testConnection.useMutation({
    onSuccess: (r) => r.success ? toast.success("Test SMS sent successfully") : toast.error(`Test failed: ${r.error}`),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Twilio Configuration
            {settings?.configured ? (
              <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Not configured</Badge>
            )}
          </CardTitle>
          {settings?.configured && (
            <CardDescription>
              Account: {settings.accountSidMasked} · From: {settings.fromNumber}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Account SID</Label>
            <Input
              placeholder={settings?.configured ? "••••••••••••••••" : "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
              value={accountSid}
              onChange={e => setAccountSid(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Auth Token</Label>
            <Input
              type="password"
              placeholder="Your Twilio auth token"
              value={authToken}
              onChange={e => setAuthToken(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>From Number</Label>
            <Input
              placeholder="+15551234567"
              value={fromNumber}
              onChange={e => setFromNumber(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={() => saveMutation.mutate({ accountSid, authToken, fromNumber })}
            disabled={!accountSid || !authToken || !fromNumber || saveMutation.isPending}
          >
            Save Credentials
          </Button>
        </CardContent>
      </Card>

      {settings?.configured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="+15551234567"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={() => testMutation.mutate({ testPhone })}
                disabled={!testPhone || testMutation.isPending}
              >
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">TCPA Compliance Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• All subscribers must have given explicit written consent before receiving messages.</p>
          <p>• STOP keyword is handled automatically by Twilio — opt-outs are immediate.</p>
          <p>• Quiet hours enforced: no sends between 9pm–9am ET.</p>
          <p>• Frequency cap: max 2/day, 5/week per subscriber.</p>
          <p>• Opt-in source, IP, and timestamp are recorded for every subscriber.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSMS() {
  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> SMS
          </h1>
          <p className="text-sm text-muted-foreground">Twilio-powered SMS broadcasts — TCPA compliant</p>
        </div>

        <Tabs defaultValue="subscribers">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="subscribers" className="text-xs">
              <Users className="h-3 w-3 mr-1" /> Subscribers
            </TabsTrigger>
            <TabsTrigger value="compose" className="text-xs">
              <Send className="h-3 w-3 mr-1" /> Compose
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3 mr-1" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subscribers" className="mt-4">
            <SubscribersTab />
          </TabsContent>
          <TabsContent value="compose" className="mt-4">
            <ComposeTab />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
