export interface LicenseSettings {
  brand_site_name: string;
  brand_tagline: string;
  brand_site_description: string;
  brand_logo_url: string;
  brand_logo_dark_url: string;
  brand_favicon_url: string;
  brand_primary_color: string;
  brand_secondary_color: string;
  brand_heading_font: string;
  brand_body_font: string;
  brand_website_url: string;
  brand_contact_email: string;
  brand_phone: string;
  brand_address: string;
  brand_business_name: string;
  adsense_enabled: string;
  adsense_publisher_id: string;
  adsense_header_unit: string;
  adsense_sidebar_unit: string;
  adsense_article_unit: string;
  sponsor_enabled: string;
  sponsor_name: string;
  sponsor_logo_url: string;
  sponsor_link_url: string;
  sponsor_banner_url: string;
  sponsor_start_date: string;
  sponsor_end_date: string;
  sponsor_bar_text: string;
  amazon_enabled: string;
  amazon_associate_tag: string;
  amazon_keywords: string;
  printify_enabled: string;
  brand_shop_nav_label: string;
  blotato_api_key: string;
  blotato_platforms: string;
  brand_palette: string;
  brand_template: string;
  categories: string;
  [key: string]: string;
}

export interface Article {
  id: number;
  headline: string;
  subheadline: string | null;
  slug: string;
  body: string;
  featuredImage: string | null;
  categoryId: number | null;
  authorId: number | null;
  publishedAt: string | null;
  viewCount: number;
  geoSummary: string | null;
  geoFaq: string | null;
  tags: string | null;
  status: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
}

export interface TemplateProps {
  licenseSettings: LicenseSettings;
  articles: Article[];
  categories: Category[];
  currentArticle?: Article;
  currentCategory?: Category;
  mostRead?: Article[];
  page: "home" | "article" | "category" | "search";
}
