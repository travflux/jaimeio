import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Image, Loader2, Info, CheckCircle, ChevronRight, ImageIcon } from "lucide-react";
import { WRITING_STYLES } from "../../../../shared/writingStyles";

export default function AdminAiGenerator() {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [styleId, setStyleId] = useState("onion");
  const [customStyle, setCustomStyle] = useState("");
  const [generatedArticle, setGeneratedArticle] = useState<{ headline: string; subheadline: string; body: string; slug: string } | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [lastSavedId, setLastSavedId] = useState<number | null>(null);
  const [imageGenerated, setImageGenerated] = useState(false);
  const [geoGenerated, setGeoGenerated] = useState(false);

  const { data: cats } = trpc.categories.list.useQuery();
  const utils = trpc.useUtils();

  const generateArticle = trpc.ai.generateArticle.useMutation({
    onSuccess: (data) => { setGeneratedArticle(data); toast.success("Article generated!"); },
    onError: (e) => toast.error(`Generation failed: ${e.message}`),
  });

  const generateImg = trpc.ai.generateImage.useMutation({
    onSuccess: (data) => { setGeneratedImage(data.url ?? ""); toast.success("Image generated!"); },
    onError: (e) => toast.error(`Image generation failed: ${e.message}`),
  });

  const createArticle = trpc.articles.create.useMutation({
    onSuccess: (data) => {
      toast.success("Article saved!");
      setLastSavedId(data.id);
      setGeneratedArticle(null);
      setTopic("");
      setImageGenerated(false);
      setGeoGenerated(false);
      utils.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerateImage = trpc.ai.generateImageForDraft.useMutation({
    onSuccess: () => { setImageGenerated(true); toast.success("Image generated for article!"); utils.articles.list.invalidate(); },
    onError: (e) => toast.error(),
  });

  const generateGeoForArticle = trpc.ai.generateGeoForArticle.useMutation({
    onSuccess: () => { setGeoGenerated(true); toast.success("GEO content generated!"); },
    onError: (e) => toast.error(),
  });

  const handleSaveArticle = () => {
    if (!generatedArticle) return;
    const catId = category ? parseInt(category) : undefined;
    createArticle.mutate({
      ...generatedArticle,
      status: "pending",
      categoryId: catId,
      featuredImage: generatedImage || undefined,
    });
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Generator</h1>
          <p className="text-muted-foreground text-sm">Generate satirical articles and images with AI.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Article generator */}
        <Card>
          <CardHeader><CardTitle className="text-base">Generate Article</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Topic / News Event</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-none" placeholder="Describe the news event or topic to satirize..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 border border-input rounded text-sm bg-background">
                <option value="">Auto-assign</option>
                {cats?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-1">
                Writing Style
                <Info className="w-3 h-3 text-muted-foreground" />
              </label>
              <select 
                value={styleId} 
                onChange={e => setStyleId(e.target.value)} 
                className="w-full px-3 py-2 border border-input rounded text-sm bg-background"
              >
                {WRITING_STYLES.map(style => (
                  <option key={style.id} value={style.id}>{style.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {WRITING_STYLES.find(s => s.id === styleId)?.description}
              </p>
            </div>
            {styleId === "custom" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Custom Style Instructions</label>
                <textarea 
                  value={customStyle} 
                  onChange={e => setCustomStyle(e.target.value)} 
                  rows={3} 
                  className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-none" 
                  placeholder="Describe your desired writing style, tone, and approach..."
                />
              </div>
            )}
            <Button onClick={() => generateArticle.mutate({ topic, category, styleId, customStyle: styleId === 'custom' ? customStyle : undefined })} disabled={!topic || generateArticle.isPending || (styleId === 'custom' && !customStyle)} className="w-full">
              {generateArticle.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate Article</>}
            </Button>

            {generatedArticle && (
              <div className="mt-4 p-4 bg-muted rounded border border-border">
                <h3 className="font-bold text-lg mb-1">{generatedArticle.headline}</h3>
                <p className="text-sm text-muted-foreground mb-2">{generatedArticle.subheadline}</p>
                <div className="text-sm max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: generatedArticle.body }} />
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={handleSaveArticle} disabled={createArticle.isPending}>
                    {createArticle.isPending ? "Saving..." : "Save as Pending"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setGeneratedArticle(null)}>Discard</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Post-save success banner */}
        {lastSavedId && !generatedArticle && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <span className="font-medium text-sm">Article saved! Next steps:</span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => regenerateImage.mutate({ id: lastSavedId })}
                disabled={regenerateImage.isPending || imageGenerated}
                className={"flex items-center justify-between px-3 py-2 rounded border text-sm transition-colors " + (imageGenerated ? "bg-green-100 border-green-300 text-green-700" : "bg-white border-green-200 text-green-800 hover:bg-green-50")}
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {imageGenerated ? "Image generated" : regenerateImage.isPending ? "Generating image..." : "Generate featured image"}
                </span>
                {!imageGenerated && <ChevronRight className="w-4 h-4" />}
                {imageGenerated && <CheckCircle className="w-4 h-4" />}
              </button>
              <button
                onClick={() => generateGeoForArticle.mutate({ id: lastSavedId })}
                disabled={generateGeoForArticle.isPending || geoGenerated}
                className={"flex items-center justify-between px-3 py-2 rounded border text-sm transition-colors " + (geoGenerated ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-blue-200 text-blue-800 hover:bg-blue-50")}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {geoGenerated ? "GEO content generated" : generateGeoForArticle.isPending ? "Generating GEO..." : "Generate GEO content"}
                </span>
                {!geoGenerated && <ChevronRight className="w-4 h-4" />}
                {geoGenerated && <CheckCircle className="w-4 h-4" />}
              </button>
              <a
                href={"/admin/articles/" + lastSavedId}
                className="flex items-center justify-between px-3 py-2 rounded border bg-white border-gray-200 text-gray-800 hover:bg-gray-50 text-sm transition-colors"
              >
                <span>Open in editor</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* Image generator */}
        <Card>
          <CardHeader><CardTitle className="text-base">Generate Image</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Image Prompt</label>
              <textarea value={imagePrompt} onChange={e => setImagePrompt(e.target.value)} rows={3} className="w-full px-3 py-2 border border-input rounded text-sm bg-background resize-none" placeholder="Describe the satirical illustration..." />
            </div>
            <Button onClick={() => generateImg.mutate({ prompt: imagePrompt })} disabled={!imagePrompt || generateImg.isPending} className="w-full">
              {generateImg.isPending ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating...</> : <><Image className="w-4 h-4 mr-1" /> Generate Image</>}
            </Button>
            {generatedImage && (
              <div className="mt-4">
                <img src={generatedImage} alt="Generated" className="w-full rounded border border-border" />
                <p className="text-xs text-muted-foreground mt-2 break-all">{generatedImage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
