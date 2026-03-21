/**
 * useClarity.ts — v4.8.0
 * Dynamically injects the Microsoft Clarity script when brand_clarity_id is set.
 * White-label compatible: each deployment uses its own Clarity project ID from the DB.
 * No-op when clarityId is empty or undefined.
 */
import { useEffect } from "react";

export function useClarity(clarityId: string | undefined) {
  useEffect(() => {
    if (!clarityId || clarityId.trim() === "") return;
    if (document.getElementById("ms-clarity-script")) return;

    const script = document.createElement("script");
    script.id = "ms-clarity-script";
    script.type = "text/javascript";
    script.innerHTML = `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${clarityId.trim()}");
    `;
    document.head.appendChild(script);
  }, [clarityId]);
}
