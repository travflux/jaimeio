import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export function useTenantContext() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const licenseQuery = trpc.tenantAuth.resolveLicense.useQuery({ hostname }, {
    retry: false, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false,
  });
  const licenseId = licenseQuery.data?.id;

  const settingsQuery = trpc.licenseSettings.getAll.useQuery(
    { licenseId: licenseId! },
    { enabled: !!licenseId, staleTime: 60000 }
  );

  const settings = useMemo(() => settingsQuery.data || {}, [settingsQuery.data]);

  return {
    licenseId: licenseId || 0,
    license: licenseQuery.data,
    settings,
    isLoading: licenseQuery.isLoading || settingsQuery.isLoading,
    refreshSettings: () => settingsQuery.refetch(),
  };
}
