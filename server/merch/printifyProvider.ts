/**
 * Printify Provider Implementation
 * Implements MerchProvider using the Printify v1 API.
 * Rate limit: 200 product publishes per 30 minutes.
 * Swap this file to switch to Printful, Gooten, etc.
 */

import type { MerchProvider, MerchProductResult, MerchVariant } from "./provider";

const BASE_URL = "https://api.printify.com/v1";

export class PrintifyProvider implements MerchProvider {
  constructor(private readonly apiToken: string, private readonly shopId: string) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
        "User-Agent": `${process.env.VITE_APP_TITLE || "satire-engine"}/1.0`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Printify API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async uploadImage(imageUrl: string): Promise<string> {
    const data = await this.request<{ id: string }>("POST", "/uploads/images.json", {
      file_name: "article-image.jpg",
      url: imageUrl,
    });
    return data.id;
  }

  async createProduct(params: {
    imageId: string;
    blueprintId: number;
    printProviderId: number;
    title: string;
    description: string;
  }): Promise<MerchProductResult> {
    // First, fetch available variants for this blueprint + provider
    const variantsData = await this.request<{
      variants: { id: number; title: string; options: Record<string, string>; placeholders: { position: string; images: { id: string }[] }[] }[];
    }>("GET", `/catalog/blueprints/${params.blueprintId}/print_providers/${params.printProviderId}/variants.json`);

    const availableVariants = variantsData.variants.slice(0, 20); // cap for initial creation

    // Build print areas — use the first placeholder position
    const firstVariant = availableVariants[0];
    const placeholderPosition = firstVariant?.placeholders?.[0]?.position ?? "front";

    const printAreas = [{
      variant_ids: availableVariants.map(v => v.id),
      placeholders: [{
        position: placeholderPosition,
        images: [{
          id: params.imageId,
          x: 0.5,
          y: 0.5,
          scale: 1,
          angle: 0,
        }],
      }],
    }];

    const product = await this.request<{
      id: string;
      variants: { id: number; title: string; cost: number; is_enabled: boolean }[];
      images: { src: string; is_default: boolean; variant_ids: number[] }[];
    }>("POST", `/shops/${this.shopId}/products.json`, {
      title: params.title,
      description: params.description,
      blueprint_id: params.blueprintId,
      print_provider_id: params.printProviderId,
      variants: availableVariants.map(v => ({ id: v.id, price: 0, is_enabled: true })),
      print_areas: printAreas,
    });

    const variants: MerchVariant[] = product.variants.map(v => ({
      id: v.id,
      title: v.title,
      price: v.cost,
      isAvailable: v.is_enabled,
    }));

    const mockupUrls = product.images
      .filter(img => img.is_default || img.variant_ids.length > 0)
      .map(img => img.src)
      .slice(0, 5);

    const basePrice = Math.min(...variants.filter(v => v.isAvailable).map(v => v.price));

    return {
      providerId: product.id,
      shopId: this.shopId,
      blueprintId: params.blueprintId,
      mockupUrls,
      basePrice,
      variants,
    };
  }

  async getCheckoutUrl(productId: string, variantId: number): Promise<string> {
    // Printify checkout URLs are constructed from the shop's external URL
    // The actual checkout is handled via Printify's storefront or a custom checkout
    // Return a Printify product URL — the frontend will handle the redirect
    return `https://printify.com/app/store/${this.shopId}/products/${productId}`;
  }

  async getProductMockups(productId: string): Promise<string[]> {
    const product = await this.request<{
      images: { src: string; is_default: boolean }[];
    }>("GET", `/shops/${this.shopId}/products/${productId}.json`);
    return product.images.map(img => img.src);
  }
}

/** Factory: creates a PrintifyProvider from admin settings. Returns null if not configured. */
export function createPrintifyProvider(apiToken: string, shopId: string): PrintifyProvider | null {
  if (!apiToken || !shopId) return null;
  return new PrintifyProvider(apiToken, shopId);
}
