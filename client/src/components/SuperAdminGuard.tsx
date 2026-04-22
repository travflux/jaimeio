import { trpc } from "@/lib/trpc";

export default function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const statsQuery = trpc.superAdmin.getPlatformStats.useQuery(undefined, {
    retry: false,
    staleTime: 60000,
  });

  if (statsQuery.isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6B7280", fontSize: 14 }}>
        Verifying access...
      </div>
    );
  }

  if (statsQuery.isError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Access Denied</div>
        <div style={{ fontSize: 14, color: "#6B7280" }}>You do not have staff access to this portal.</div>
        <a href="/" style={{ fontSize: 13, color: "#2DD4BF", textDecoration: "none" }}>Return to platform</a>
      </div>
    );
  }

  return <>{children}</>;
}
