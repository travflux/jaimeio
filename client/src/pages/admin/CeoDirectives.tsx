import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

type Priority = "Critical" | "High" | "Medium" | "Low";
type Status = "Pending" | "In Progress" | "Complete" | "Cancelled";

const PRIORITY_COLORS: Record<Priority, string> = {
  Critical: "bg-red-600",
  High: "bg-orange-600",
  Medium: "bg-blue-600",
  Low: "bg-green-600",
};

const STATUS_COLORS: Record<Status, string> = {
  Complete: "bg-green-600",
  "In Progress": "bg-blue-600",
  Pending: "bg-amber-500",
  Cancelled: "bg-gray-500",
};

function PriorityBadge({ priority }: { priority: string }) {
  const cls = PRIORITY_COLORS[priority as Priority] ?? "bg-gray-500";
  return <Badge className={`${cls} text-white`}>{priority}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status as Status] ?? "bg-gray-500";
  return <Badge className={`${cls} text-white`}>{status}</Badge>;
}

export default function CeoDirectives() {
  const utils = trpc.useUtils();

  const { data: directives = [], isLoading } = trpc.ceoDirectives.list.useQuery();

  const createMutation = trpc.ceoDirectives.create.useMutation({
    onSuccess: () => {
      toast.success("Directive created");
      utils.ceoDirectives.list.invalidate();
      setShowAdd(false);
      resetForm();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const updateStatusMutation = trpc.ceoDirectives.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      utils.ceoDirectives.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  const deleteMutation = trpc.ceoDirectives.delete.useMutation({
    onSuccess: () => {
      toast.success("Directive deleted");
      utils.ceoDirectives.list.invalidate();
    },
    onError: (e) => toast.error("Error", { description: e.message }),
  });

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formFrom, setFormFrom] = useState("CEO");
  const [formPriority, setFormPriority] = useState<Priority>("High");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("Pending");

  // Edit status state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<Status>("Pending");
  const [editCompletedDate, setEditCompletedDate] = useState("");

  function resetForm() {
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormFrom("CEO");
    setFormPriority("High");
    setFormSubject("");
    setFormBody("");
    setFormStatus("Pending");
  }

  function handleCreate() {
    if (!formSubject.trim() || !formBody.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    createMutation.mutate({
      directiveDate: formDate,
      fromName: formFrom || undefined,
      priority: formPriority,
      subject: formSubject.trim(),
      body: formBody.trim(),
      status: formStatus,
    });
  }

  function openEditStatus(d: { id: number; status: string; completedDate?: string | null }) {
    setEditingId(d.id);
    setEditStatus(d.status as Status);
    setEditCompletedDate(d.completedDate ?? "");
  }

  function handleUpdateStatus() {
    if (editingId === null) return;
    updateStatusMutation.mutate({
      id: editingId,
      status: editStatus,
      completedDate: editCompletedDate || undefined,
    });
  }

  function handleDelete(id: number, subject: string) {
    if (!confirm(`Delete directive "${subject}"? This cannot be undone.`)) return;
    deleteMutation.mutate({ id });
  }

  const pendingCount = directives.filter(d => d.status === "Pending").length;
  const inProgressCount = directives.filter(d => d.status === "In Progress").length;
  const criticalCount = directives.filter(d => d.priority === "Critical" && d.status !== "Complete" && d.status !== "Cancelled").length;

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CEO Directives</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Strategic instructions and priorities from leadership. Visible on the{" "}
            <a href="/api/briefing-room-m4x1q" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1">
              CEO Dashboard <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Directive
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold">{directives.length}</div>
            <div className="text-sm text-muted-foreground">Total Directives</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-3xl font-bold text-amber-500">{pendingCount + inProgressCount}</div>
            <div className="text-sm text-muted-foreground">Open ({pendingCount} pending, {inProgressCount} in progress)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className={`text-3xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-green-600"}`}>{criticalCount}</div>
            <div className="text-sm text-muted-foreground">Critical Open</div>
          </CardContent>
        </Card>
      </div>

      {/* Directives table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Directives
            {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {directives.length === 0 && !isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No directives yet. Click "Add Directive" to create the first one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-semibold">Date</th>
                    <th className="text-left py-2 px-3 font-semibold">From</th>
                    <th className="text-left py-2 px-3 font-semibold">Priority</th>
                    <th className="text-left py-2 px-3 font-semibold">Subject</th>
                    <th className="text-left py-2 px-3 font-semibold">Status</th>
                    <th className="text-left py-2 px-3 font-semibold">Completed</th>
                    <th className="text-left py-2 px-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {directives.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 whitespace-nowrap">{d.directiveDate}</td>
                      <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{d.fromName ?? "CEO"}</td>
                      <td className="py-2 px-3"><PriorityBadge priority={d.priority} /></td>
                      <td className="py-2 px-3">
                        <div className="font-medium">{d.subject}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">{d.body}</div>
                      </td>
                      <td className="py-2 px-3"><StatusBadge status={d.status} /></td>
                      <td className="py-2 px-3 whitespace-nowrap text-muted-foreground">{d.completedDate ?? "—"}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditStatus(d)}>
                            Update Status
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(d.id, d.subject)}>
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Add Directive Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add CEO Directive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>From</Label>
                <Input placeholder="CEO" value={formFrom} onChange={e => setFormFrom(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={formPriority} onValueChange={v => setFormPriority(v as Priority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Initial Status</Label>
                <Select value={formStatus} onValueChange={v => setFormStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input placeholder="Brief directive title" value={formSubject} onChange={e => setFormSubject(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Body</Label>
              <Textarea placeholder="Full directive details, context, and expected outcome..." rows={4} value={formBody} onChange={e => setFormBody(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Directive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={editingId !== null} onOpenChange={open => { if (!open) setEditingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Directive Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={v => setEditStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(editStatus === "Complete" || editStatus === "Cancelled") && (
              <div className="space-y-1">
                <Label>Completed / Cancelled Date</Label>
                <Input type="date" value={editCompletedDate} onChange={e => setEditCompletedDate(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}
