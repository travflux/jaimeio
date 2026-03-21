import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, XCircle, MessageSquare } from "lucide-react";

type Comment = {
  id: number;
  articleId: number | null;
  userId: number | null;
  authorName: string | null;
  content: string | null;
  status: string | null;
  createdAt: Date;
};

export default function AdminComments() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const { data: comments } = trpc.comments.list.useQuery({ status: statusFilter, limit: 50 });
  const utils = trpc.useUtils();
  const moderate = trpc.comments.moderate.useMutation({
    onSuccess: () => { utils.comments.list.invalidate(); toast.success("Comment moderated"); },
  });

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comments</h1>
          <p className="text-muted-foreground text-sm">Moderate reader comments.</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6">
        {["pending", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${statusFilter === s ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border hover:bg-accent hover:border-transparent"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(comments as Comment[] | undefined)?.map((c: Comment) => (
          <Card key={c.id} className="overflow-hidden hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{(c.authorName ?? "A")[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-semibold">{c.authorName || "Anonymous"}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                    <StatusBadge status={c.status ?? "pending"} variant="comment" />
                  </div>
                  <p className="text-sm leading-relaxed pl-9">{c.content}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 pl-9">Article #{c.articleId}</p>
                </div>
                {statusFilter === "pending" && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => moderate.mutate({ id: c.id, status: "approved" })} className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg text-emerald-600 transition-colors" title="Approve">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => moderate.mutate({ id: c.id, status: "rejected" })} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors" title="Reject">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!comments || comments.length === 0) && (
          <div className="py-16 text-center">
            <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No {statusFilter} comments.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Comments will appear here when readers engage with articles.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
