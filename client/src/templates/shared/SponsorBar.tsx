import React from "react";
import type { LicenseSettings } from "./types";

interface SponsorBarProps {
  licenseSettings: LicenseSettings;
}

export function SponsorBar({ licenseSettings }: SponsorBarProps) {
  if (licenseSettings.sponsor_enabled !== "true") return null;

  const now = new Date();
  const start = licenseSettings.sponsor_start_date ? new Date(licenseSettings.sponsor_start_date) : null;
  const end = licenseSettings.sponsor_end_date ? new Date(licenseSettings.sponsor_end_date) : null;

  if (start && now < start) return null;
  if (end && now > end) return null;

  const name = licenseSettings.sponsor_name;
  const logo = licenseSettings.sponsor_logo_url;
  const link = licenseSettings.sponsor_link_url;
  const text = licenseSettings.sponsor_bar_text;

  if (!name && !logo) return null;

  return (
    <a
      href={link || "#"}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "8px 24px",
        background: "var(--brand-surface)",
        borderBottom: "1px solid var(--brand-border)",
        textDecoration: "none",
        color: "var(--brand-text-secondary)",
        fontSize: 13,
      }}
    >
      <span style={{ opacity: 0.7, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Presented by
      </span>
      {logo ? (
        <img src={logo} alt={name || "Sponsor"} style={{ maxHeight: 24, objectFit: "contain" }} />
      ) : (
        <span style={{ fontWeight: 600 }}>{name}</span>
      )}
      {text && <span style={{ opacity: 0.8 }}>{text}</span>}
    </a>
  );
}
