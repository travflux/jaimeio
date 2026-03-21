/**
 * useWizardKeyAudit.ts — v4.8.0
 * Dev-time only: warns in the browser console when a wizard setting key is
 * rendered on a screen but missing from the keysForScreen allowlist.
 * This catches the class of silent-drop bug found in v4.7.3-patch1 and v4.7.5
 * immediately during development rather than in production.
 *
 * Usage: call inside the AdminSetup component after keysForScreen is defined.
 *   useWizardKeyAudit(currentScreen.id, renderedKeys, keysForScreen);
 */
import { useEffect } from "react";

export function useWizardKeyAudit(
  screenId: string,
  renderedKeys: string[],
  keysForScreen: Record<string, string[]>
): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const allowed = new Set(keysForScreen[screenId] ?? []);
    const missing = renderedKeys.filter((k) => !allowed.has(k));
    if (missing.length > 0) {
      console.warn(
        `[Wizard keysForScreen] Screen "${screenId}" renders ${missing.length} key(s) NOT in keysForScreen — they will NOT be saved:\n` +
          missing.map((k) => `  • ${k}`).join("\n")
      );
    }
  }, [screenId, renderedKeys, keysForScreen]);
}
