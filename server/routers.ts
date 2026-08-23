import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as db from "./db";

function hasValidPublisherToken(candidate: string): boolean {
  const configured = process.env.ALERT_INGESTION_TOKEN;
  if (!configured) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  alerts: router({
    publisherHealth: publicProcedure
      .input(z.object({ token: z.string().min(1).max(512) }))
      .query(({ input }) => {
        if (!hasValidPublisherToken(input.token)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Authorized alert publisher token required." });
        }
        return { accepted: true, mode: "controlled-ingestion", externalFeedsConfigured: false } as const;
      }),
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
      .query(({ input }) => db.listDisasterAlerts(input?.limit ?? 50)),
    ingest: publicProcedure
      .input(z.object({ token: z.string().min(1).max(512), id: z.string().min(1).max(64), title: z.string().min(1).max(180), summary: z.string().min(1).max(4000), type: z.string().min(1).max(80), severity: z.enum(["critical", "high", "moderate", "low"]), issuedAt: z.coerce.date(), expiresAt: z.coerce.date().nullable().optional(), originDeviceId: z.string().min(1).max(128) }))
      .mutation(async ({ input }) => {
        if (!hasValidPublisherToken(input.token)) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authorized alert publisher token required." });
        if (input.expiresAt && input.expiresAt <= input.issuedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "expiresAt must be after issuedAt." });
        try {
          await db.createDisasterAlert({ id: input.id, title: input.title, summary: input.summary, type: input.type, severity: input.severity, source: "controlled_publisher", issuedAt: input.issuedAt, expiresAt: input.expiresAt ?? null, originDeviceId: input.originDeviceId });
        } catch (error) {
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: error instanceof Error ? error.message : "Server alert storage is unavailable." });
        }
        return { accepted: true, source: "controlled_publisher" } as const;
      }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
