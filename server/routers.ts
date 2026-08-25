import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import * as db from "./db";
import { INDIA_HAZARDS, INDIA_PROVIDER_ADAPTERS } from "../shared/india-response";
import { getOfficialFeedReadiness } from "./ndma-sachet-cap";
import { ENV } from "./_core/env";

function hasValidPublisherToken(candidate: string): boolean {
  const configured = process.env.ALERT_INGESTION_TOKEN;
  if (!configured) return false;
  const left = Buffer.from(candidate);
  const right = Buffer.from(configured);
  return left.length === right.length && timingSafeEqual(left, right);
}

function publisherTokenFromRequestHeaders(headers: Record<string, unknown>): string {
  const value = headers["x-airmesh-publisher-token"];
  return Array.isArray(value) ? String(value[0] ?? "") : typeof value === "string" ? value : "";
}

function requirePublisherToken(headers: Record<string, unknown>): void {
  if (!hasValidPublisherToken(publisherTokenFromRequestHeaders(headers))) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authorized alert publisher token required." });
  }
}

function isAuthorityOperator(user: { openId: string; role: "user" | "admin" }): boolean {
  return user.role === "admin" || Boolean(ENV.ownerOpenId && user.openId === ENV.ownerOpenId);
}

function requireAuthorityOperator(user: { openId: string; role: "user" | "admin" }): void {
  if (!isAuthorityOperator(user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "An authorized Air-Mesh operator account is required." });
  }
}

const controlledAlertInput = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(4000),
  type: z.string().trim().min(1).max(80),
  severity: z.enum(["critical", "high", "moderate", "low"]),
  issuedAt: z.coerce.date(),
  expiresAt: z.coerce.date().nullable().optional(),
  originDeviceId: z.string().trim().min(1).max(128),
  hazard: z.enum(INDIA_HAZARDS).default("other"),
  locale: z.string().trim().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).max(16).default("en-IN"),
  target: z.object({
    label: z.string().trim().min(1).max(180),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    radiusM: z.number().int().min(50).max(100_000),
  }).optional(),
});

const controlledAlertResolutionInput = z.object({
  id: z.string().trim().min(1).max(64),
  resolvedAt: z.coerce.date().optional(),
});

const safetyCheckInInput = z.object({
  id: z.string().trim().min(1).max(64),
  status: z.enum(["safe", "rescue_requested"]),
  deviceId: z.string().trim().min(1).max(128),
  hazard: z.enum(INDIA_HAZARDS).default("other"),
  alertId: z.string().trim().min(1).max(64).optional(),
  note: z.string().trim().max(500).optional(),
  location: z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) }).optional(),
});

const MAX_CONTROLLED_ALERT_FUTURE_SKEW_MS = 5 * 60 * 1000;

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
    officialFeedStatus: publicProcedure.query(() => getOfficialFeedReadiness()),
    publisherHealth: publicProcedure
      .query(({ ctx }) => {
        requirePublisherToken(ctx.req.headers as Record<string, unknown>);
        return { accepted: true, mode: "controlled-ingestion", externalFeedsConfigured: false } as const;
      }),
    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
      .query(async ({ input }) => {
        try {
          return await db.listDisasterAlerts(input?.limit ?? 50);
        } catch (error) {
          console.error("[Alerts] Controlled alert list unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Controlled alert service unavailable." });
        }
      }),
    ingest: publicProcedure
      .input(controlledAlertInput)
      .mutation(async ({ ctx, input }) => {
        requirePublisherToken(ctx.req.headers as Record<string, unknown>);
        if (input.expiresAt && input.expiresAt <= input.issuedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "expiresAt must be after issuedAt." });
        if (input.issuedAt.getTime() > Date.now() + MAX_CONTROLLED_ALERT_FUTURE_SKEW_MS) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "issuedAt is too far in the future." });
        }
        try {
          await db.createDisasterAlert({ id: input.id, title: input.title, summary: input.summary, type: input.type, severity: input.severity, source: "controlled_publisher", issuedAt: input.issuedAt, expiresAt: input.expiresAt ?? null, originDeviceId: input.originDeviceId, hazard: input.hazard, locale: input.locale, targetLabel: input.target?.label ?? null, targetLatitude: input.target?.latitude ?? null, targetLongitude: input.target?.longitude ?? null, targetRadiusM: input.target?.radiusM ?? null, status: "active", resolvedAt: null });
        } catch (error) {
          console.error("[Alerts] Controlled alert ingestion unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, source: "controlled_publisher", status: "active" } as const;
      }),
    update: publicProcedure
      .input(controlledAlertInput)
      .mutation(async ({ ctx, input }) => {
        requirePublisherToken(ctx.req.headers as Record<string, unknown>);
        if (input.expiresAt && input.expiresAt <= input.issuedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "expiresAt must be after issuedAt." });
        if (input.issuedAt.getTime() > Date.now() + MAX_CONTROLLED_ALERT_FUTURE_SKEW_MS) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "issuedAt is too far in the future." });
        }
        try {
          await db.createDisasterAlert({ id: input.id, title: input.title, summary: input.summary, type: input.type, severity: input.severity, source: "controlled_publisher", issuedAt: input.issuedAt, expiresAt: input.expiresAt ?? null, originDeviceId: input.originDeviceId, hazard: input.hazard, locale: input.locale, targetLabel: input.target?.label ?? null, targetLatitude: input.target?.latitude ?? null, targetLongitude: input.target?.longitude ?? null, targetRadiusM: input.target?.radiusM ?? null, status: "active", resolvedAt: null });
        } catch (error) {
          console.error("[Alerts] Controlled alert update unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, source: "controlled_publisher", status: "active" } as const;
      }),
    resolve: publicProcedure
      .input(controlledAlertResolutionInput)
      .mutation(async ({ ctx, input }) => {
        requirePublisherToken(ctx.req.headers as Record<string, unknown>);
        const resolvedAt = input.resolvedAt ?? new Date();
        try {
          const resolved = await db.resolveDisasterAlert(input.id, resolvedAt);
          if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Controlled alert was not found." });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Alerts] Controlled alert resolution unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, id: input.id, status: "resolved", resolvedAt } as const;
      }),
  }),

  authority: router({
    session: protectedProcedure.query(({ ctx }) => ({
      authorized: isAuthorityOperator(ctx.user),
      role: ctx.user.role,
      displayName: ctx.user.name ?? ctx.user.email ?? "Signed-in operator",
      boundary: "controlled_server_only" as const,
    })),
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        requireAuthorityOperator(ctx.user);
        try {
          return await db.listDisasterAlerts(input?.limit ?? 50);
        } catch (error) {
          console.error("[Authority] Alert monitor unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Authority alert monitor is unavailable." });
        }
      }),
    publish: protectedProcedure
      .input(controlledAlertInput)
      .mutation(async ({ ctx, input }) => {
        requireAuthorityOperator(ctx.user);
        if (input.expiresAt && input.expiresAt <= input.issuedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "expiresAt must be after issuedAt." });
        if (input.issuedAt.getTime() > Date.now() + MAX_CONTROLLED_ALERT_FUTURE_SKEW_MS) throw new TRPCError({ code: "BAD_REQUEST", message: "issuedAt is too far in the future." });
        try {
          await db.createDisasterAlert({ id: input.id, title: input.title, summary: input.summary, type: input.type, severity: input.severity, source: "controlled_publisher", issuedAt: input.issuedAt, expiresAt: input.expiresAt ?? null, originDeviceId: `operator:${ctx.user.id}`, hazard: input.hazard, locale: input.locale, targetLabel: input.target?.label ?? null, targetLatitude: input.target?.latitude ?? null, targetLongitude: input.target?.longitude ?? null, targetRadiusM: input.target?.radiusM ?? null, status: "active", resolvedAt: null });
        } catch (error) {
          console.error("[Authority] Alert publication unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, source: "controlled_publisher", status: "active" } as const;
      }),
    update: protectedProcedure
      .input(controlledAlertInput)
      .mutation(async ({ ctx, input }) => {
        requireAuthorityOperator(ctx.user);
        if (input.expiresAt && input.expiresAt <= input.issuedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "expiresAt must be after issuedAt." });
        if (input.issuedAt.getTime() > Date.now() + MAX_CONTROLLED_ALERT_FUTURE_SKEW_MS) throw new TRPCError({ code: "BAD_REQUEST", message: "issuedAt is too far in the future." });
        try {
          await db.createDisasterAlert({ id: input.id, title: input.title, summary: input.summary, type: input.type, severity: input.severity, source: "controlled_publisher", issuedAt: input.issuedAt, expiresAt: input.expiresAt ?? null, originDeviceId: `operator:${ctx.user.id}`, hazard: input.hazard, locale: input.locale, targetLabel: input.target?.label ?? null, targetLatitude: input.target?.latitude ?? null, targetLongitude: input.target?.longitude ?? null, targetRadiusM: input.target?.radiusM ?? null, status: "active", resolvedAt: null });
        } catch (error) {
          console.error("[Authority] Alert update unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, source: "controlled_publisher", status: "active" } as const;
      }),
    resolve: protectedProcedure
      .input(controlledAlertResolutionInput)
      .mutation(async ({ ctx, input }) => {
        requireAuthorityOperator(ctx.user);
        const resolvedAt = input.resolvedAt ?? new Date();
        try {
          const resolved = await db.resolveDisasterAlert(input.id, resolvedAt);
          if (!resolved) throw new TRPCError({ code: "NOT_FOUND", message: "Controlled alert was not found." });
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[Authority] Alert resolution unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Server alert storage is unavailable." });
        }
        return { accepted: true, id: input.id, status: "resolved", resolvedAt } as const;
      }),
  }),

  response: router({
    providerReadiness: publicProcedure.query(() => ({ country: "IN", emergencyNumber: "112", adapters: INDIA_PROVIDER_ADAPTERS })),
    checkIn: protectedProcedure
      .input(safetyCheckInInput)
      .mutation(async ({ ctx, input }) => {
        try {
          await db.createSafetyCheckIn({ id: input.id, userId: ctx.user.id, deviceId: input.deviceId, status: input.status, hazard: input.hazard, alertId: input.alertId ?? null, note: input.note ?? null, latitude: input.location?.latitude ?? null, longitude: input.location?.longitude ?? null, createdAt: new Date() });
        } catch (error) {
          console.error("[Response] Safety check-in unavailable", error instanceof Error ? error.message : "unknown");
          throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Safety check-in service unavailable. Keep the local record and try again later." });
        }
        return { accepted: true, status: input.status, dispatchRequested: false } as const;
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
