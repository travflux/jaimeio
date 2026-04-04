import React, { useState, useEffect } from "react";
import type { Article } from "./types";

interface BreakingTickerProps {
  articles: Article[];
}

export function BreakingTicker({ articles }: BreakingTickerProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(() => setCurrent(i => (i + 1) % articles.length), 4000);
    return () => clearInterval(timer);
  }, [articles.length]);

  if (!articles.length) return null;

  const article = articles[current];

  return (
    <div style={{
      background: "var(--brand-primary)",
      color: "var(--brand-nav-text)",
      height: 32,
      display: "flex",
      alignItems: "center",
      overflow: "hidden",
      fontSize: 13,
    }}>
      <span style={{
        padding: "0 12px",
        fontWeight: 700,
        textTransform: "uppercase",
        fontSize: 11,
        letterSpacing: "0.08em",
        flexShrink: 0,
        background: "rgba(0,0,0,0.15)",
        height: "100%",
        display: "flex",
        alignItems: "center",
      }}>
        LATEST:
      </span>
      <a
        href={`/article/${article.slug}`}
        style={{
          color: "inherit",
          textDecoration: "none",
          padding: "0 16px",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          transition: "opacity 0.3s",
        }}
      >
        {article.headline}
      </a>
    </div>
  );
}
