import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Sparkles, Eye, Code, FileText, Loader2,
  CheckCircle, XCircle, Send, Wand2, RotateCcw, ImageIcon, Video
} from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Link } from "wouter";

type ArticleStatus = "draft" | "pending" | "approved" | "published" | "rejected";

interface FormState {
  headline: string;
  subheadline: string;
  body: string;
  slug: string;
  status: ArticleStatus;
  categoryId: number | undefined;
  featuredImage: string;
  videoUrl: string;
}

const EMPTY_FORM: FormState = {
  headline: "", subheadline: "", body: "", slug: "", status: "draft",
  categoryId: undefined, featuredImage: "", videoUrl: "",
};

export default function AdminArticleEditor() {
  const [, params] = useRoute("/admin/articles/:id");
  const isNew = params?.id === "new" || !params?.id;
  const articleId = isNew ? undefined : parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();

  const { data: article, isLoading: articleLoading } = trpc.articles.getById.useQuery(
    { id: articleId! }, { enabled: !!articleId }
  );
  const { data: cats } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [aiAssistMode, setAiAssistMode] = useState(false);
  const [aiStyle, setAiStyle] = useState("onion");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Validation state
  const { data: validation } = trpc.articles.validate.useQuery(
    { headline: form.headline, body: form.body, featuredImage: form.featuredImage },
    { enabled: form.headline.length > 0 || form.body.length > 0 }
  );

  // Track original state for dirty checking
  const [originalForm, setOriginalForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (article) {
      const loaded: FormState = {
        headline: article.headline,
        subheadline: article.subheadline ?? "",
        body: article.body,
        slug: article.slug,
        status: article.status as ArticleStatus,
        categoryId: article.categoryId ?? undefined,
        featuredImage: article.featuredImage ?? "",
        videoUrl: article.videoUrl ?? "",
      };
      setForm(loaded);
      setOriginalForm(loaded);
      setHasUnsavedChanges(false);
    }
  }, [article]);

  // Track changes
  const updateForm = useCallback((updater: (prev: FormState) => FormState) => {
    setForm(prev => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  }, []);

  // Mutations
  const createMut = trpc.articles.create.useMutation({
    onSuccess: (data) => {
      toast.success("Article created successfully!");
      setHasUnsavedChanges(false);
      navigate(`/admin/articles/${data.id}`);
      utils.articles.list.invalidate();
      utils.articles.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article saved!");
      setHasUnsavedChanges(false);
      setOriginalForm(form);
      utils.articles.list.invalidate();
      utils.articles.getById.invalidate();
      utils.articles.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMut = trpc.articles.updateStatus.useMutation({
    onSuccess: () => {
      utils.articles.list.invalidate();
      utils.articles.getById.invalidate();
      utils.articles.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // AI Assist mutation
  const aiGenerate = trpc.ai.generateArticle.useMutation({
    onError: (e) => toast.error(`AI generation failed: ${e.message}`),
  });

  const aiImage = trpc.ai.generateImage.useMutation({
    onError: (e) => toast.error(`Image generation failed: ${e.message}`),
  });

  const aiVideo = trpc.ai.generateVideo.useMutation({
    onError: (e: any) => toast.error(`Video generation failed: ${e.message}`),
  });

  const regenerateVideoMut = trpc.articles.regenerateVideo.useMutation({
    onSuccess: (data) => {
      if (data.videoUrl) {
        updateForm(f => ({ ...f, videoUrl: data.videoUrl! }));
        toast.success("Video regenerated!");
        utils.articles.getById.invalidate();
      }
    },
    onError: (e: any) => toast.error(`Video regeneration failed: ${e.message}`),
  });

  // Handlers
  const handleSave = () => {
    if (!form.headline.trim()) { toast.error("Headline is required."); return; }
    if (!form.body.trim()) { toast.error("Article body is required."); return; }
    if (!form.slug.trim()) { toast.error("Slug is required. Click 'Auto' to generate one."); return; }

    if (isNew) {
      createMut.mutate(form);
    } else {
      updateMut.mutate({ id: articleId!, ...form });
    }
  };

  const handleStatusChange = (newStatus: ArticleStatus) => {
    if (!articleId) return;
    // Save any pending edits first, then update status
    if (hasUnsavedChanges) {
      updateMut.mutate({ id: articleId, ...form, status: newStatus }, {
        onSuccess: () => {
          toast.success(`Article ${newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : newStatus === "published" ? "published" : "updated"}!`);
          setHasUnsavedChanges(false);
          setForm(f => ({ ...f, status: newStatus }));
          utils.articles.list.invalidate();
          utils.articles.getById.invalidate();
          utils.articles.stats.invalidate();
        },
      });
    } else {
      statusMut.mutate({ id: articleId, status: newStatus }, {
        onSuccess: () => {
          toast.success(`Article ${newStatus === "approved" ? "approved" : newStatus === "rejected" ? "rejected" : newStatus === "published" ? "published" : "updated"}!`);
          setForm(f => ({ ...f, status: newStatus }));
        },
      });
    }
  };

  const generateSlug = () => {
    const slug = form.headline.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    updateForm(f => ({ ...f, slug }));
  };

  const handleAiAssist = () => {
    if (!form.headline.trim()) {
      toast.error("Write a headline first, then AI will draft the body.");
      return;
    }

    aiGenerate.mutate(
      { topic: form.headline, styleId: aiStyle },
      {
        onSuccess: (data) => {
          updateForm(f => ({
            ...f,
            subheadline: f.subheadline || data.subheadline,
            body: data.body,
            slug: f.slug || data.slug,
          }));
          toast.success("AI draft generated! Review and edit as needed.");
        },
      }
    );
  };

  const handleAiImage = () => {
    const prompt = `Satirical editorial illustration for a news article titled: "${form.headline}". ${form.subheadline ? `Subtitle: ${form.subheadline}.` : ""} Style: editorial cartoon, newspaper illustration, witty visual metaphor.`;
    aiImage.mutate({ prompt }, {
      onSuccess: (data) => {
        if (data.url) {
          updateForm(f => ({ ...f, featuredImage: data.url! }));
          toast.success("Featured image generated!");
        }
      },
    });
  };

  const handleAiVideo = () => {
    const prompt = `Professional news broadcast style, high production quality, cinematic lighting. News headline: "${form.headline}". ${form.subheadline ? `Subtitle: ${form.subheadline}.` : ""}`;
    aiVideo.mutate({ prompt }, {
      onSuccess: (data) => {
        if (data.url) {
          updateForm(f => ({ ...f, videoUrl: data.url! }));
          toast.success("Video generated!");
        }
      },
    });
  };

  const isSaving = createMut.isPending || updateMut.isPending;
  const isAiWorking = aiGenerate.isPending;

  // Warn about unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) { e.preventDefault(); }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  if (articleLoading && !isNew) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
       {/* Header */}
       <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 lg:mb-8">
        <div className="flex items-center gap-3 flex-1">
          <Link href="/admin/articles">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors" title="Back to articles">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight">
                {isNew ? "New Article" : "Edit Article"}
              </h1>
              {!isNew && <StatusBadge status={form.status} variant="article" />}
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Unsaved</span>
              )}
            </div>
            {!isNew && article?.sourceEvent && (
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Source: {article.sourceEvent}
                {article.sourceUrl && (
                  <> — <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">original</a></>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons — scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {!isNew && form.status === "pending" && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("rejected")}
                className="text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap" disabled={statusMut.isPending}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("approved")}
                className="text-green-600 border-green-200 hover:bg-green-50 whitespace-nowrap" disabled={statusMut.isPending}>
                <CheckCircle className="w-4 h-4 mr-1" /> Approve
              </Button>
            </>
          )}
          {!isNew && form.status === "approved" && (
            <Button variant="outline" size="sm" onClick={() => handleStatusChange("published")}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 whitespace-nowrap" disabled={statusMut.isPending}>
              <Send className="w-4 h-4 mr-1" /> Publish
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || (validation && !validation.valid)} className="whitespace-nowrap">
            <Save className="w-4 h-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Validation warnings/errors */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            {validation.errors.length > 0 && (
              <div className="mb-4">
                <div className="flex items-start gap-2 text-red-600">
                  <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Errors (must fix before saving):</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div>
                <div className="flex items-start gap-2 text-amber-600">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Warnings (recommended fixes):</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validation.warnings.map((warn, i) => <li key={i}>{warn}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor — 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Headline */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={e => updateForm(f => ({ ...f, headline: e.target.value }))}
                  className="w-full px-4 py-3 border border-input rounded-lg text-lg font-headline bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Write your headline here..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subheadline</label>
                <input
                  type="text"
                  value={form.subheadline}
                  onChange={e => updateForm(f => ({ ...f, subheadline: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Optional subheadline or deck..."
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Assist bar */}
          <Card className={`transition-all ${aiAssistMode ? "ring-2 ring-purple-300 border-purple-200" : ""}`}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setAiAssistMode(!aiAssistMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    aiAssistMode
                      ? "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  AI Assist {aiAssistMode ? "ON" : "OFF"}
                </button>

                {aiAssistMode && (
                  <>
                    <select
                      value={aiStyle}
                      onChange={e => setAiStyle(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-input rounded bg-background"
                    >
                      <option value="onion">The Onion style</option>
                      <option value="babylon">Babylon Bee style</option>
                      <option value="borowitz">Borowitz style</option>
                      <option value="clickhole">ClickHole style</option>
                    </select>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiAssist}
                      disabled={isAiWorking || !form.headline.trim()}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {isAiWorking ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Drafting...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-1" /> Draft Body from Headline</>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiImage}
                      disabled={aiImage.isPending || !form.headline.trim()}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {aiImage.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><ImageIcon className="w-4 h-4 mr-1" /> Generate Image</>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiVideo}
                      disabled={aiVideo.isPending || !form.headline.trim()}
                      className="text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                      {aiVideo.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><Video className="w-4 h-4 mr-1" /> Generate Video</>
                      )}
                    </Button>

                    <span className="text-xs text-muted-foreground">
                      Write a headline, then click "Draft Body" to let AI write the article.
                    </span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Body editor with tabs */}
          <Card>
            <CardContent className="pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-3">
                  <TabsTrigger value="write" className="gap-1.5">
                    <Code className="w-3.5 h-3.5" /> Write
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="write" className="mt-0">
                  <div className="relative">
                    {isAiWorking && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded">
                        <div className="flex items-center gap-3 text-purple-600">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="font-medium">AI is drafting your article...</span>
                        </div>
                      </div>
                    )}
                    <textarea
                      value={form.body}
                      onChange={e => updateForm(f => ({ ...f, body: e.target.value }))}
                      rows={12}
                      className="w-full px-4 py-3 border border-input rounded text-sm bg-background font-mono resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all leading-relaxed"
                      placeholder={aiAssistMode
                        ? "Write your headline above, then click 'Draft Body from Headline' to let AI write the article. You can then edit the result here."
                        : "<p>Write your article here using HTML tags...</p>\n\n<p>Use &lt;p&gt; tags for paragraphs, &lt;blockquote&gt; for quotes, etc.</p>"
                      }
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>{form.body.length} characters</span>
                      <span>HTML supported: &lt;p&gt;, &lt;h2&gt;, &lt;blockquote&gt;, &lt;ul&gt;, &lt;em&gt;, &lt;strong&gt;</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-0">
                  <div className="border border-input rounded p-6 min-h-[400px] bg-white">
                    {form.headline && (
                      <h1 className="font-headline text-3xl font-bold mb-2 text-gray-900">{form.headline}</h1>
                    )}
                    {form.subheadline && (
                      <p className="text-lg text-gray-500 mb-4 italic">{form.subheadline}</p>
                    )}
                    {form.featuredImage && (
                      <img src={form.featuredImage} alt="" className="w-full rounded mb-6 max-h-80 object-cover" />
                    )}
                    {form.body ? (
                      <div
                        className="prose prose-lg max-w-none text-gray-800"
                        dangerouslySetInnerHTML={{ __html: form.body }}
                      />
                    ) : (
                      <p className="text-muted-foreground italic">No content yet. Start writing or use AI Assist.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar — 1 column */}
        <div className="space-y-4">
          {/* Status & Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Status & Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={form.status}
                  onChange={e => updateForm(f => ({ ...f, status: e.target.value as ArticleStatus }))}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                >
                  <option value="draft">Draft</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Quick action buttons */}
              {!isNew && (
                <div className="flex flex-col gap-2 pt-2">
                  {form.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange("approved")}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        disabled={statusMut.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange("rejected")}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        disabled={statusMut.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {form.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("published")}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full"
                      disabled={statusMut.isPending}
                    >
                      <Send className="w-4 h-4 mr-1" /> Publish Now
                    </Button>
                  )}
                  {(form.status === "rejected" || form.status === "published") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange("draft")}
                      className="w-full"
                      disabled={statusMut.isPending}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" /> Revert to Draft
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Slug & Category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={form.slug}
                    onChange={e => updateForm(f => ({ ...f, slug: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-input rounded text-sm bg-background"
                    placeholder="article-url-slug"
                  />
                  <Button variant="outline" size="sm" onClick={generateSlug} title="Auto-generate from headline">
                    Auto
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={form.categoryId ?? ""}
                  onChange={e => updateForm(f => ({ ...f, categoryId: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                >
                  <option value="">No category</option>
                  {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Featured Image</CardTitle>
              <CardDescription className="text-xs">
                Paste a URL or use AI to generate one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="text"
                value={form.featuredImage}
                onChange={e => updateForm(f => ({ ...f, featuredImage: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                placeholder="https://..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiImage}
                disabled={aiImage.isPending || !form.headline.trim()}
                className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                {aiImage.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1" /> AI Generate from Headline</>
                )}
              </Button>
              {form.featuredImage && (
                <div className="relative group">
                  <img
                    src={form.featuredImage}
                    alt="Featured"
                    className="w-full rounded border border-border aspect-video object-cover"
                  />
                  <button
                    onClick={() => updateForm(f => ({ ...f, featuredImage: "" }))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    &times;
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* LLM Image Prompt */}
          {!isNew && article?.llmImagePrompt && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">LLM Image Prompt</CardTitle>
                <CardDescription className="text-xs">
                  Scene description generated by LLM during image generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-muted rounded text-sm text-muted-foreground break-words">
                  {article.llmImagePrompt}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Video URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Video</CardTitle>
              <CardDescription className="text-xs">
                Paste a URL or use AI to generate one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="text"
                value={form.videoUrl || ""}
                onChange={e => updateForm(f => ({ ...f, videoUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
                placeholder="https://..."
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiVideo}
                  disabled={aiVideo.isPending || !form.headline.trim()}
                  className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  {aiVideo.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-1" /> AI Generate</>
                  )}
                </Button>
                {!isNew && form.videoUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerateVideoMut.mutate({ id: articleId! })}
                    disabled={regenerateVideoMut.isPending}
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    title="Regenerate video using current settings"
                  >
                    {regenerateVideoMut.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Regenerating...</>
                    ) : (
                      <><RotateCcw className="w-4 h-4 mr-1" /> Regenerate</>
                    )}
                  </Button>
                )}
              </div>
              {form.videoUrl && (
                <div className="relative group">
                  <video
                    src={form.videoUrl}
                    controls
                    className="w-full rounded border border-border aspect-video object-cover"
                  />
                  <button
                    onClick={() => updateForm(f => ({ ...f, videoUrl: "" }))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove video"
                  >
                    &times;
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source info (for workflow-imported articles) */}
          {!isNew && article?.sourceEvent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Source Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{article.sourceEvent}</p>
                {article.sourceUrl && (
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 block"
                  >
                    View original source
                  </a>
                )}
                {article.batchDate && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Batch: {article.batchDate}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}


