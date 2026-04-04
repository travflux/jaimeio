import React from "react";
import type { LicenseSettings } from "./types";

interface AdZoneProps {
  placement: "header" | "sidebar" | "article" | "footer";
  licenseSettings: LicenseSettings;
  className?: string;
}

export function AdZone({ placement, licenseSettings, className }: AdZoneProps) {
  const enabled = licenseSettings.adsense_enabled === "true";
  const publisherId = licenseSettings.adsense_publisher_id;
  const unitId = licenseSettings[`adsense_${placement}_unit`];

  if (!enabled || !publisherId || !unitId) return null;

  return (
    <div className={className} style={{ textAlign: "center", minHeight: placement === "sidebar" ? 250 : 90 }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={`ca-pub-${publisherId}`}
        data-ad-slot={unitId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
