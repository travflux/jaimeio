/** Magazine template responsive CSS — media queries for all breakpoints */
export const magazineStyles = `
/* ── Magazine Header ────────────────────────────────────────── */
.mag-header-inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 20px 24px;
  max-width: 1280px;
  margin: 0 auto;
  gap: 16px;
}

/* ── Magazine Hero ──────────────────────────────────────────── */
.mag-hero-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
}

/* ── Magazine Category Rows ─────────────────────────────────── */
.mag-category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* ── Magazine Editor Picks ──────────────────────────────────── */
.mag-picks-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* ── Magazine Newsletter Form ───────────────────────────────── */
.mag-newsletter-form {
  display: flex;
  gap: 8px;
}
.mag-newsletter-form input,
.mag-newsletter-form button {
  min-height: 44px;
}

/* ── Magazine Footer ────────────────────────────────────────── */
.mag-footer-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  padding: 64px 24px;
  max-width: 1280px;
  margin: 0 auto;
}

/* ── Magazine Main Layout ───────────────────────────────────── */
.mag-main-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 40px;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

/* ── Magazine Article Grid ──────────────────────────────────── */
.mag-article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* Tablet: 640px – 1023px                                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
@media (max-width: 1023px) {
  .mag-hero-grid {
    grid-template-columns: 1fr 1fr;
  }
  .mag-category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mag-picks-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mag-article-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mag-main-layout {
    grid-template-columns: 1fr;
  }
  .mag-footer-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .mag-header-inner {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 12px;
    padding: 16px 24px;
  }
  .mag-header-date {
    display: none;
  }
  .mag-header-actions {
    justify-content: center;
  }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/* Mobile: <640px                                               */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
@media (max-width: 639px) {
  .mag-hero-grid {
    grid-template-columns: 1fr;
  }
  .mag-category-grid {
    grid-template-columns: 1fr;
  }
  .mag-picks-grid {
    grid-template-columns: 1fr;
  }
  .mag-article-grid {
    grid-template-columns: 1fr;
  }
  .mag-newsletter-form {
    flex-direction: column;
  }
  .mag-newsletter-form input,
  .mag-newsletter-form button {
    width: 100%;
  }
  .mag-footer-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .mag-header-inner {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 8px;
    padding: 16px 16px;
  }
  .mag-header-date {
    display: none;
  }
  .mag-header-actions {
    justify-content: center;
  }
  /* Minimum 16px body text to prevent iOS zoom */
  .mag-body-text {
    font-size: 16px;
  }
  /* Minimum 44px touch targets */
  .mag-touch-target {
    min-height: 44px;
    min-width: 44px;
  }
}
`;
