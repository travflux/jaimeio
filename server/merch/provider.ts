/**
 * Merch Provider Interface
 * Abstract layer over any print-on-demand provider (Printify, Printful, Gooten, etc.)
 * Swap the implementation in printifyProvider.ts without touching store pages or the sidebar.
 */

export interface MerchVariant {
  id: number;
  title: string;       // e.g. "S / White", "XL / Black"
  price: number;       // base price in cents
  isAvailable: boolean;
}

export interface MerchProductResult {
  providerId: string;       // provider-specific product ID
  shopId: string;
  blueprintId: number;
  mockupUrls: string[];     // full-resolution mockup image URLs
  basePrice: number;        // lowest variant base price in cents
  variants: MerchVariant[];
  checkoutUrl?: string;     // direct checkout URL if available at creation time
}

export interface MerchProvider {
  /** Upload an image URL to the provider and return a provider image ID */
  uploadImage(imageUrl: string): Promise<string>;

  /** Create a product on the provider using an uploaded image ID */
  createProduct(params: {
    imageId: string;
    blueprintId: number;
    printProviderId: number;
    title: string;
    description: string;
  }): Promise<MerchProductResult>;

  /** Get a direct checkout URL for a specific product + variant */
  getCheckoutUrl(productId: string, variantId: number): Promise<string>;

  /** Get mockup images for an existing product */
  getProductMockups(productId: string): Promise<string[]>;
}

// ─── Pricing Utility ──────────────────────────────────────────────────────────
/**
 * Apply markup and round to .99 pricing.
 * sell_price = FLOOR(base * (1 + markup/100)) + 0.99
 * Example: base $7.00, 50% markup → $10.50 → $10.99
 */
export function calculateSellPrice(basePriceCents: number, markupPercent: number): number {
  const marked = basePriceCents * (1 + markupPercent / 100);
  const dollars = marked / 100;
  return Math.floor(dollars) + 0.99;
}

export type ProductType = "mug" | "shirt" | "poster" | "case" | "digital";

export const PRODUCT_LABELS: Record<ProductType, { icon: string; label: string }> = {
  mug:     { icon: "☕", label: "Put it on a Mug" },
  shirt:   { icon: "👕", label: "Put it on a T-Shirt" },
  poster:  { icon: "🖼️", label: "Put it on a Poster" },
  case:    { icon: "📱", label: "Put it on a Phone Case" },
  digital: { icon: "💾", label: "Download as Digital Print" },
};
