import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Key, Users, Building2, CheckCircle2, AlertCircle, Clock, XCircle,
  Trash2, Edit, RefreshCw, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

const tierColors: Record<string, string> = {
  starter: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  professional: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  enterprise: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const statusIcons: Record<string, any> = {
  active: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />,
  expired: <Clock className="w-3.5 h-3.5 text-yellow-600" />,
  suspended: <AlertCircle className="w-3.5 h-3.5 text-red-600" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-gray-500" />,
};

function CreateLicenseModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    clientName: "",
    email: "",
    domain: "",
    subdomain: "",
    tier: "professional" as "starter" | "professional" | "enterprise",
    maxUsers: 10,
    notes: "",
  });
  const [error, setError] = useState("");

  const createMutation = trpc.licenseManagement.create.useMutation({
    onSuccess: (data) => {
      toast.success(`License created! Key: ${data.licenseKey}`);
      onCreated();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" /> Create License
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              createMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Client Name</label>
                <input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="admin@acme.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Domain</label>
                <input
                  value={form.domain}
                  onChange={(e) => set("domain", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="news.acme.com"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Subdomain</label>
                <div className="flex items-center gap-1">
                  <input
                    value={form.subdomain}
                    onChange={(e) => set("subdomain", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    className="flex-1 px-3 py-2 border rounded-md bg-background text-sm font-mono"
                    placeholder="acme"
                    required
                  />
                  <span className="text-xs text-muted-foreground">.getjaime.io</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tier</label>
                <select
                  value={form.tier}
                  onChange={(e) => set("tier", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Max Users</label>
                <input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => set("maxUsers", parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                  min={1}
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm h-20 resize-none"
                  placeholder="Internal notes about this license..."
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create License"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LicenseUsersPanel({ licenseId }: { licenseId: number }) {
  const usersQuery = trpc.userManagement.listByLicense.useQuery({ licenseId });
  const users = usersQuery.data ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "editor" as const });

  const createMutation = trpc.userManagement.create.useMutation({
    onSuccess: () => {
      toast.success("User created");
      usersQuery.refetch();
      setShowCreate(false);
      setNewUser({ email: "", name: "", password: "", role: "editor" });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.userManagement.delete.useMutation({
    onSuccess: () => { toast.success("User deleted"); usersQuery.refetch(); },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <Users className="w-4 h-4" /> Users ({users.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3 h-3 mr-1" /> Add User
        </Button>
      </div>

      {showCreate && (
        <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={newUser.name}
              onChange={(e) => setNewUser(p => ({ ...p, name: e.target.value }))}
              className="px-2 py-1.5 border rounded text-sm bg-background"
              placeholder="Name"
            />
            <input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser(p => ({ ...p, email: e.target.value }))}
              className="px-2 py-1.5 border rounded text-sm bg-background"
              placeholder="Email"
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser(p => ({ ...p, password: e.target.value }))}
              className="px-2 py-1.5 border rounded text-sm bg-background"
              placeholder="Password (min 8 chars)"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser(p => ({ ...p, role: e.target.value as any }))}
              className="px-2 py-1.5 border rounded text-sm bg-background"
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate({ licenseId, ...newUser })}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No users yet</p>
      ) : (
        <div className="space-y-1">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 text-sm">
              <div>
                <span className="font-medium">{u.name}</span>
                <span className="text-muted-foreground ml-2">{u.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{u.role}</Badge>
                {!u.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive h-7 w-7 p-0"
                  onClick={() => {
                    if (confirm(`Delete user ${u.email}?`)) deleteMutation.mutate({ id: u.id });
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLicenses() {
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const licensesQuery = trpc.licenseManagement.list.useQuery();
  const licenses = licensesQuery.data ?? [];

  const deleteMutation = trpc.licenseManagement.delete.useMutation({
    onSuccess: () => { toast.success("License cancelled"); utils.licenseManagement.list.invalidate(); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-headline">Licenses</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage client licenses and users
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Create License
        </Button>
      </div>

      {showCreate && (
        <CreateLicenseModal
          onClose={() => setShowCreate(false)}
          onCreated={() => utils.licenseManagement.list.invalidate()}
        />
      )}

      <Card>
        <CardContent className="p-0">
          {licenses.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Key className="w-10 h-10 mb-3 opacity-40" />
              <p className="font-medium">No licenses</p>
              <p className="text-sm">Click "Create License" to add your first client.</p>
            </div>
          ) : (
            <div className="divide-y">
              {licenses.map((l: any) => (
                <div key={l.id}>
                  <div
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">{l.clientName}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {l.subdomain ? `${l.subdomain}.getjaime.io` : l.domain}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={tierColors[l.tier] || ""}>{l.tier}</Badge>
                      <div className="flex items-center gap-1">{statusIcons[l.status]}<span className="text-xs capitalize">{l.status}</span></div>
                      <span className="text-xs text-muted-foreground">{l.userCount} users</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedId === l.id ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  {expandedId === l.id && (
                    <div className="px-4 pb-4 border-t bg-muted/10">
                      <div className="grid grid-cols-3 gap-4 py-3 text-sm">
                        <div>
                          <span className="text-muted-foreground text-xs block">License Key</span>
                          <span className="font-mono text-xs">{l.licenseKey}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Email</span>
                          <span className="text-xs">{l.email}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Max Users</span>
                          <span className="text-xs">{l.maxUsers}</span>
                        </div>
                      </div>
                      <LicenseUsersPanel licenseId={l.id} />
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Cancel license for ${l.clientName}?`)) {
                              deleteMutation.mutate({ id: l.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Cancel License
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
