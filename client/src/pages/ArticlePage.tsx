import { trpc } from "@/lib/trpc";
import { TrendingUp } from "lucide-react";
import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import ReadingProgress from "@/components/ReadingProgress";
import { AdInArticle, AdBanner } from "@/components/AdUnit";
import { Loader2, ArrowLeft, Clock, ArrowRight } from "lucide-react";
import ShareButtons from "@/components/ShareButtons";
import { SiteLoader } from "@/components/SiteLoader";
import AmazonAd from "@/components/AmazonAd";
import TrendingNow from "@/components/TrendingNow";
import { useEffect } from "react";
import { setOGTags } from "@/lib/og-tags";
import { SponsorBar } from "@/components/SponsorBar";
import { ArticleSponsorBanner } from "@/components/ArticleSponsorBanner";
import { generateBreadcrumbSchema, generateArticleSchema, addSchemaMarkup } from "@/lib/schema-markup";
import { buildCanonicalURL, setCanonicalURL } from "@/lib/canonical-url";
import { useScrollAnimations } from "@/hooks/useScrollAnimation";
import { useBranding } from "@/hooks/useBranding";
import { usePageView } from "@/hooks/usePageView";
import YouMightAlsoLike from "@/components/YouMightAlsoLike";
import MerchSidebar from "@/components/MerchSidebar";
import DisqusEmbed from "@/components/DisqusEmbed";

export default function ArticlePage() {
  useScrollAnimations();
  // Only activate favicon easter egg if the feature is enabled
  const { branding } = useBranding();
  const [, params] = useRoute("/article/:slug");
  const slug = params?.slug ?? "";
  const { data: article, isLoading } = trpc.articles.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const { data: cats } = trpc.categories.list.useQuery();
  const { data: settingsRaw } = trpc.settings.list.useQuery();
  const amazonTag = settingsRaw?.find(s => s.key === 'amazon_associate_tag')?.value || '';
  const amazonEnabled = settingsRaw?.find(s => s.key === 'amazon_products_enabled')?.value === 'true';
  const amazonLink = settingsRaw?.find(s => s.key === 'amazon_affiliate_link')?.value || '';
  const merchEnabled = settingsRaw?.find(s => s.key === 'merch_sidebar_enabled')?.value === 'true';
  const { data: amazonKeywordsData } = trpc.articles.amazonKeywords.useQuery(
    { articleId: article?.id ?? 0 },
    { enabled: !!article?.id && amazonEnabled }
  );
  const amazonKeywords = amazonKeywordsData?.keywords || `${article?.headline || ''} books humor ${branding.genre || 'news'}`;

  const { data: mostReadData } = trpc.articles.mostRead.useQuery();
  const { data: articleTags } = trpc.tags.forArticle.useQuery(
    { articleId: article?.id ?? 0 },
    { enabled: !!article?.id }
  );

  const catMap = new Map(cats?.map(c => [c.id, { name: c.name, slug: c.slug }]) ?? []);
  usePageView({ slug, path: `/article/${slug}` });

  const mostRead = mostReadData ?? [];
  
  // Parse article body if it contains JSON (fix for legacy articles with malformed body)
  const articleBody = article?.body ? (() => {
    const trimmed = article.body.trim();
    console.log('[ArticlePage] Parsing article body, length:', trimmed.length);
    console.log('[ArticlePage] Starts with {:', trimmed.startsWith('{'), 'Ends with }:', trimmed.endsWith('}'));
    
    // Check if body is a JSON object
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      console.log('[ArticlePage] Body appears to be JSON, attempting to parse...');
      try {
        const parsed = JSON.parse(trimmed);
        
        // If parsed object has a 'body' field, extract it
        if (parsed.body && typeof parsed.body === 'string') {
          let extractedBody = parsed.body;
          
          // Replace escaped newlines with actual newlines
          extractedBody = extractedBody.replace(/\\n/g, '\n');
          
          // Convert to HTML paragraphs if not already HTML
          if (!extractedBody.trim().startsWith('<')) {
            const paragraphs = extractedBody.split('\n\n').filter((p: string) => p.trim());
            extractedBody = paragraphs.map((p: string) => `<p>${p.trim()}</p>`).join('');
          }
          
          return extractedBody;
        }
        
        // If JSON doesn't have body field, return original
        return article.body;
      } catch (e) {
        // JSON parsing failed, return as-is
        console.error('[ArticlePage] Failed to parse article body JSON:', e);
        return article.body;
      }
    }
    
    // Not JSON, return as-is
    return article.body;
  })() : '';
  
  // Add NewsArticle schema, Open Graph tags, and canonical URL
  useEffect(() => {
    if (article && cats) {
      // Set canonical URL
      setCanonicalURL(buildCanonicalURL(`/article/${article.slug}`));
      // NewsArticle schema
      const newsArticleSchema = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": article.headline,
        "description": article.subheadline || article.headline,
        "image": article.featuredImage || "",
        "datePublished": article.publishedAt || article.createdAt,
        "dateModified": article.updatedAt || article.publishedAt || article.createdAt,
        "author": {
          "@type": "Person",
          "name": branding.editorialTeam
        },
        "publisher": {
          "@type": "Organization",
          "name": branding.siteName,
          "logo": {
            "@type": "ImageObject",
            "url": `${window.location.origin}/logo.png`
          }
        }
      };
      
      // Add NewsArticle schema
      addSchemaMarkup(newsArticleSchema, 'article-schema');
      
      // Add BreadcrumbList schema
      const categoryData = catMap.get(article.categoryId ?? 0);
      const breadcrumbs = [
        { name: 'Home', url: `${window.location.origin}/` },
      ];
      if (categoryData) {
        breadcrumbs.push({ name: categoryData.name, url: `${window.location.origin}/category/${categoryData.slug}` });
      }
      breadcrumbs.push({ name: article.headline, url: window.location.href });
      
      const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);
      addSchemaMarkup(breadcrumbSchema, 'breadcrumb-schema');
      
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(newsArticleSchema);
      script.setAttribute('data-schema-id', 'article-schema');
      document.head.appendChild(script);
      
      // Set Open Graph tags using utility function
      const publishedTime = article.publishedAt || article.createdAt;
      const modifiedTime = article.updatedAt || article.publishedAt || article.createdAt;
      
      // Build 3-8 focused article-specific keywords
      const catData = catMap.get(article.categoryId ?? 0);
      const categoryKeyword = catData?.name?.toLowerCase() || '';

      // Extract 1-2 meaningful content words from the headline
      // Strip common stop words and short tokens, keep nouns/proper nouns
      const STOP_WORDS = new Set([
        'a','an','the','and','or','but','in','on','at','to','for','of','with',
        'by','from','is','are','was','were','be','been','being','have','has',
        'had','do','does','did','will','would','could','should','may','might',
        'shall','can','need','dare','used','ought','its','it','this','that',
        'these','those','i','we','you','he','she','they','who','which','what',
        'how','when','where','why','not','no','nor','so','yet','both','either',
        'neither','each','few','more','most','other','some','such','than','too',
        'very','just','over','after','before','into','out','up','down','as',
        'about','against','between','through','during','without','within',
        'along','following','across','behind','beyond','plus','except','until',
        'while','among','versus','via','amid','despite','towards','upon','says',
        'said','report','reports','new','now','man','woman','people','year',
        'years','day','days','time','times','way','ways','thing','things',
        'world','back','first','last','long','great','little','own','right',
        'big','high','small','large','next','early','young','important','public',
        'private','real','best','free','old','good','bad','only','even','also',
      ]);
      const headlineWords = (article.headline || '')
        .replace(/[^a-zA-Z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map(w => w.toLowerCase().replace(/^-+|-+$/g, ''))
        .filter(w => w.length > 3 && !STOP_WORDS.has(w));
      // Deduplicate and take up to 2 headline keywords
      const headlineKeywords = Array.from(new Set(headlineWords)).slice(0, 2);

      const articleKeywords = [
        ...headlineKeywords,
        categoryKeyword,
        branding.genre || '',
        `${branding.genre || ''} news`.trim(),
        branding.siteName || '',
        categoryKeyword ? `${categoryKeyword} ${branding.genre || 'news'}` : '',
        'humor',
      ].filter(Boolean).slice(0, 8).join(', ');

      setOGTags({
        title: article.headline,
        description: article.subheadline || article.headline,
        keywords: articleKeywords,
        image: article.featuredImage || `${window.location.origin}/logo.png`,
        url: typeof window !== 'undefined' ? window.location.href : '',
        type: 'article',
        author: branding.editorialTeam,
        publishedTime: publishedTime instanceof Date ? publishedTime.toISOString() : publishedTime,
        modifiedTime: modifiedTime instanceof Date ? modifiedTime.toISOString() : modifiedTime,
      });
      
      return () => {
        if (script && script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, [article]);

  if (isLoading) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <SiteLoader message="Loading article..." size="large" />
      </div>
    </div>
  );

  if (!article) return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 container py-32 text-center">
        <h2 className="font-headline text-3xl font-bold mb-3 tracking-tight">Article Not Found</h2>
        <Link href="/" className="text-primary hover:underline text-[15px]">Back to Home</Link>
      </div>
      <Footer />
    </div>
  );

  const categoryData = catMap.get(article.categoryId ?? 0);

  // Estimate reading time
  const wordCount = article.body ? article.body.replace(/<[^>]+>/g, '').split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="min-h-screen flex flex-col">
      <ReadingProgress />
      <Navbar />
      <SponsorBar articleSlug={slug} />
      <main className="flex-1">
        <div className="container py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
            <div className="lg:col-span-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[14px] text-muted-foreground/70 mb-8 font-medium">
            <Link href="/" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <ArrowLeft className="w-3 h-3" /> Home
            </Link>
            {categoryData && (
              <>
                <span className="text-border">/</span>
                <Link href={`/category/${categoryData.slug}`} className="hover:text-foreground transition-colors">
                  {categoryData.name}
                </Link>
              </>
            )}
          </nav>

          {/* Article header */}
          <header className="mb-10">
            {categoryData && (
              <span className="inline-block text-[13px] font-bold uppercase tracking-[0.14em] text-primary bg-primary/8 px-3 py-1.5 rounded-md border border-primary/10">
                {categoryData.name}
              </span>
            )}
            <h1 className="font-headline text-3xl sm:text-4xl lg:text-[2.75rem] font-black leading-[1.15] mt-4 tracking-[-0.015em]">
              {article.headline}
            </h1>
            {article.subheadline && (
              <p className="text-lg sm:text-xl text-muted-foreground mt-4 leading-relaxed font-light">
                {article.subheadline}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-4 mt-6 text-[14px] text-muted-foreground/70 border-t border-border/50 pt-4 font-medium">
              <span>
                {new Date(article.publishedAt || article.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-border">·</span>
              <span>{article.views} views</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{readingTime} min read</span>
            </div>
            {/* Minimal inline share bar */}
            <div className="mt-5 flex items-center gap-4">
              <ShareButtons
                url={typeof window !== "undefined" ? window.location.href : ""}
                title={article.headline}
                summary={article.subheadline || undefined}
                imageUrl={article.featuredImage || undefined}
                variant="inline"
              />
            </div>
            {/* Article tags */}
            {articleTags && articleTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {articleTags.map(tag => (
                  <a
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted hover:bg-muted/80 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    #{tag.name}
                  </a>
                ))}
              </div>
            )}
          </header>

          {/* Featured image — show mascot placeholder when no image */}
          <figure className="mb-10 -mx-4 sm:mx-0">
            {article.featuredImage ? (
              <img
                src={article.featuredImage}
                alt={article.headline}
                className="w-full sm:rounded-sm shadow-lg"
                loading="eager"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1";
                    img.src = branding.mascotUrl || "/mascot.png";
                    img.className = "w-full sm:rounded-sm shadow-lg object-contain bg-muted/40 max-h-64";
                  }
                }}
              />
            ) : (
              <div className="w-full sm:rounded-sm bg-muted/40 flex items-center justify-center py-12">
                <img
                  src={branding.mascotUrl || "/mascot.png"}
                  alt={branding.mascotName || branding.siteName}
                  className="h-32 w-auto object-contain opacity-30"
                />
              </div>
            )}
            <figcaption className="text-[12px] text-muted-foreground/50 mt-2 px-4 sm:px-0 italic">
              {article.imageAttribution ? (
                <span dangerouslySetInnerHTML={{ __html: article.imageAttribution }} />
              ) : (
                `Illustration for ${branding.siteName}`
              )}
            </figcaption>
          </figure>

          {/* Merch inline — between image and article body (mobile) */}
          {merchEnabled && slug && article && (
            <MerchSidebar
              articleSlug={slug}
              articleHeadline={article.headline}
              articleImage={article.featuredImage}
              variant="inline"
            />
          )}

          {/* Video player */}
          {article.videoUrl && (
            <div className="mb-10">
              <video
                controls
                className="w-full rounded-xl bg-black"
                poster={article.featuredImage || undefined}
              >
                <source src={article.videoUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* Article body */}
          <div className="max-w-[680px]">
            <div className="article-body prose max-w-none drop-cap" dangerouslySetInnerHTML={{ __html: articleBody }} />
          </div>

          {/* Article sponsor banner — below content, above share buttons */}
          <ArticleSponsorBanner articleSlug={slug} />
          {/* Share bar after article */}
          <div className="mt-10 py-8 border-t border-b border-border/50 animate-on-scroll">
            <p className="text-center text-[14px] font-semibold text-muted-foreground/60 mb-3">Enjoyed this article? Share it with friends.</p>
            <ShareButtons
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={article.headline}
              summary={article.subheadline || undefined}
              imageUrl={article.featuredImage || undefined}
              variant="bar"
            />
          </div>

          {/* In-article ad */}
          <AdInArticle />

          {/* Source attribution */}
          {article.sourceEvent && (
            <div className="mt-10 p-5 bg-muted/30 rounded-sm border border-border/50">
              <p className="text-[13px] text-muted-foreground/70 uppercase tracking-[0.1em] font-semibold mb-1.5">
                Inspired by real events
              </p>
              <p className="text-[15px] leading-relaxed">{article.sourceEvent}</p>
              {article.createdAt && (
                <p className="text-[13px] text-muted-foreground/60 mt-2 italic">
                  Inspired by real news on {new Date(article.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          )}



           {/* Ad banner */}
          <AdBanner className="mt-10" />

          {/* Disqus Comments */}
          {(() => {
            const commentsEnabled = settingsRaw?.find(s => s.key === 'article_comments_enabled')?.value === 'true';
            const disqusShortname = settingsRaw?.find(s => s.key === 'disqus_shortname')?.value?.trim() || '';
            if (!commentsEnabled || !disqusShortname) return null;
            const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
            const pageId = slug;
            return (
              <div className="mt-10 pt-8 border-t border-border/50 animate-on-scroll">
                <h2 className="font-serif text-xl font-bold mb-6">Comments</h2>
                <DisqusEmbed shortname={disqusShortname} pageUrl={pageUrl} pageId={pageId} />
              </div>
            );
          })()}

              {/* Related articles */}
              {slug && (
                <YouMightAlsoLike
                  currentSlug={slug}
                  categoryId={article?.categoryId ?? null}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-4 space-y-5 animate-on-scroll lg:sticky lg:top-6 lg:self-start">
              <TrendingNow />

              {mostRead.length > 0 && (
                <div className="bg-card border border-border rounded-lg p-6 card-hover">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[18px] font-bold text-foreground">Most Read</span>
                  </div>

                  <div className="space-y-4">
                    {mostRead.map((a, i) => (
                      <Link key={a.id} href={`/article/${a.slug}`} className="group block">
                        <div className="flex gap-3">
                          <span className="text-[24px] font-bold text-primary/20 leading-none shrink-0 group-hover:text-primary/40 transition-colors duration-300">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[14px] font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2 mb-1">
                              {a.headline}
                            </h3>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>{a.views?.toLocaleString() ?? 0} views</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  <Link href="/most-read" className="inline-flex items-center gap-2 mt-4 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors">
                    View All Most Read
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {/* Amazon affiliate products */}
              {amazonEnabled && (amazonTag || amazonLink) && (
                <AmazonAd 
                  associateTag={amazonTag}
                  keywords={amazonKeywords}
                  affiliateLink={amazonLink}
                  variant="card"
                />
              )}
              {/* Merch sidebar (desktop) — mobile strip rendered inside MerchSidebar below article body */}
              {merchEnabled && slug && article && (
                <MerchSidebar
                  articleSlug={slug}
                  articleHeadline={article.headline}
                  articleImage={article.featuredImage}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
