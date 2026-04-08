export function StagingBanner() {
  const isStaging = typeof window !== "undefined" && (window as any).__JAIME_ENV === "staging";
  if (!isStaging) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 32,
      background: "#F59E0B", color: "#1C1917", fontSize: 13, fontWeight: 500,
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      STAGING ENVIRONMENT — changes here do not affect production
    </div>
  );
}
