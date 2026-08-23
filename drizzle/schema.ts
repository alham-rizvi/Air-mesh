import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const disasterAlerts = mysqlTable("disaster_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  severity: mysqlEnum("severity", ["critical", "high", "moderate", "low"]).notNull(),
  source: mysqlEnum("source", ["controlled_publisher", "local_report", "mesh_relay"]).notNull(),
  issuedAt: timestamp("issued_at").notNull(),
  expiresAt: timestamp("expires_at"),
  originDeviceId: varchar("origin_device_id", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("idx_disaster_alerts_issued").on(table.issuedAt), index("idx_disaster_alerts_severity").on(table.severity)]);

export type DisasterAlertRow = typeof disasterAlerts.$inferSelect;
export type InsertDisasterAlertRow = typeof disasterAlerts.$inferInsert;
