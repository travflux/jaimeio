/**
 * fontLoader.ts
 *
 * Loads bundled Inter font files as base64 strings for embedding in SVG templates.
 * Fonts are cached in memory after first load so disk I/O happens only once per
 * server lifetime.
 *
 * White-label compatible: the font files live in server/assets/fonts/ which is
 * part of the engine repo. Deployments get the same fonts automatically.
 */

import fs from "fs";
import path from "path";

let cachedRegular: string | null = null;
let cachedBold: string | null = null;

function loadFont(filename: string): string {
  const fontPath = path.join(process.cwd(), "server", "assets", "fonts", filename);
  if (!fs.existsSync(fontPath)) {
    throw new Error(`Font file not found: ${fontPath}`);
  }
  return fs.readFileSync(fontPath).toString("base64");
}

/**
 * Returns the base64-encoded Inter Regular font.
 * Cached after first call.
 */
export function getInterRegularBase64(): string {
  if (!cachedRegular) {
    cachedRegular = loadFont("Inter-Regular.ttf");
  }
  return cachedRegular;
}

/**
 * Returns the base64-encoded Inter Bold font.
 * Cached after first call.
 */
export function getInterBoldBase64(): string {
  if (!cachedBold) {
    cachedBold = loadFont("Inter-Bold.ttf");
  }
  return cachedBold;
}

/**
 * Returns an SVG <defs> block containing @font-face declarations for both
 * Inter Regular and Inter Bold, ready to embed at the top of any SVG.
 */
export function getInterFontDefs(): string {
  const regular = getInterRegularBase64();
  const bold = getInterBoldBase64();
  return `<defs>
    <style>
      @font-face {
        font-family: 'Inter';
        font-weight: 400;
        src: url('data:font/truetype;base64,${regular}') format('truetype');
      }
      @font-face {
        font-family: 'Inter';
        font-weight: 700;
        src: url('data:font/truetype;base64,${bold}') format('truetype');
      }
    </style>
  </defs>`;
}
