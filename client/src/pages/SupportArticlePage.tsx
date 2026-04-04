import { trpc } from "@/lib/trpc";
import { useRoute } from "wouter";
import { Loader2, ChevronRight, BookOpen } from "lucide-react";

export default function SupportArticlePage() {
  const [, params] = useRoute("/support/:slug");
  const slug = params?.slug || "";
  const articleQuery = trpc.support.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const article = articleQuery.data;

  if (articleQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
          <h1 className="text-xl font-bold">Article Not Found</h1>
          <p className="text-muted-foreground text-sm mt-2">This support article doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <a href="/">
            <img src="/jaimeio-logo-light.png" alt="JAIME.IO" className="h-7" />
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <span>Support</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{article.title}</span>
        </nav>

        <article className="prose prose-slate max-w-none">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }} />
        </article>

        <div className="mt-12 pt-6 border-t text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} JAIME.IO &mdash; AI-Powered Content Platform
        </div>
      </div>
    </div>
  );
}

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-primary underline">$1</a>')
    .replace(/^---$/gm, '<hr class="my-8" />')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}
