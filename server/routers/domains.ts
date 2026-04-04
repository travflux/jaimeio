import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import * as cd from "../customDomains";

export const domainsRouter = router({
  list: adminProcedure.query(async () => {
    return cd.listDomains();
  }),

  register: adminProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        domain: z.string().min(3),
        publicationName: z.string().min(1),
        notifyEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await cd.registerDomain(
        input.clientId,
        input.domain,
        input.publicationName
      );

      if (result.success && input.notifyEmail) {
        cd.sendDomainSetupEmail(
          input.notifyEmail,
          input.domain,
          input.publicationName
        ).catch(() => {});
      }

      return result;
    }),

  verify: adminProcedure
    .input(z.object({ domain: z.string() }))
    .mutation(async ({ input }) => {
      return cd.verifyDomain(input.domain);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await cd.deleteDomain(input.id);
      return { success: true };
    }),
});
