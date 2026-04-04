import { router, adminProcedure } from "../_core/trpc";
import { getOverviewStats } from "../analytics/overviewService";

export const analyticsRouter = router({
  overview: adminProcedure.query(async () => {
    return getOverviewStats();
  }),
});
