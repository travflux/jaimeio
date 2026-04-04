import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/** Accepts either super admin or tenant user auth. Always preserves ctx.licenseId. */
const requireAnyAuth = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (ctx.user) return next({ ctx: { ...ctx, user: ctx.user, licenseId: ctx.licenseId } });
  if (ctx.tenantUser) return next({ ctx: { ...ctx, user: { id: ctx.tenantUser.id, role: "admin", name: ctx.tenantUser.name, email: ctx.tenantUser.email } as any, licenseId: ctx.tenantUser.licenseId || ctx.licenseId } });
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login" });
});
export const tenantOrAdminProcedure = t.procedure.use(requireAnyAuth);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
