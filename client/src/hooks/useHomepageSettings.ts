import { trpc } from "@/lib/trpc";

export function useHomepageSettings() {
  const { data, isLoading } = trpc.homepage.get.useQuery();

  return {
    showTicker: data?.homepage_show_ticker === "true",
    showTrending: data?.homepage_show_trending === "true",
    showCategories: data?.homepage_show_categories === "true",
    showSidebar: data?.homepage_show_sidebar !== "false", // default true if not set
    initialArticleCount: parseInt(data?.homepage_initial_article_count || "40"),
    isLoading,
  };
}
