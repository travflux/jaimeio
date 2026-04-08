import React from "react";

interface AmazonProduct {
  asin: string;
  title: string;
  imageUrl: string | null;
  price: string | null;
  affiliateUrl: string;
  rating: number | null;
  reviewCount: number | null;
}

export function AmazonSidebarWidget({ products, articleSlug }: { products: AmazonProduct[]; articleSlug: string }) {
  if (!products || products.length === 0) return null;

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
      <div style={{ padding: "8px 14px", borderBottom: "1px solid #e5e7eb", fontSize: 10, fontWeight: 500, color: "#6b7280", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#FF9900", fontWeight: 700 }}>amazon</span>
        <span>Gear for this article</span>
      </div>
      {products.map(p => (
        <a key={p.asin} href={`/api/go/amazon?url=${encodeURIComponent(p.affiliateUrl)}&articleSlug=${articleSlug}&asin=${p.asin}`}
          target="_blank" rel="nofollow sponsored"
          style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f3f4f6", textDecoration: "none", color: "inherit" }}>
          {p.imageUrl ? (
            <img src={p.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 4, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📦</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.title}</div>
            {p.price && <div style={{ fontSize: 13, fontWeight: 500, color: "#B12704", marginTop: 2 }}>{p.price}</div>}
            <span style={{ display: "inline-block", background: "#FF9900", color: "#111", fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 3, marginTop: 4 }}>Amazon ↗</span>
          </div>
        </a>
      ))}
      <div style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", padding: "6px 0" }}>
        As an Amazon Associate, this publication earns from qualifying purchases.
      </div>
    </div>
  );
}
