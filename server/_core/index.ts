import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import * as db from "../db";

const TRUSTED_ORIGIN_PATTERN = /^https:\/\/[a-z0-9-]+\.manus\.(computer|space)$/i;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  const configured = (process.env.CORS_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return configured.includes(origin) || TRUSTED_ORIGIN_PATTERN.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Allow only configured deployment origins, Manus preview origins, and local development origins.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (typeof origin === "string" && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-AirMesh-Publisher-Token",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: false }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", async (_req, res) => {
    const database = await db.getDatabaseHealth();
    const degraded = database.configured && !database.available;
    res.status(degraded ? 503 : 200).json({ ok: !degraded, timestamp: Date.now(), database });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("[api] startup failed", error);
  process.exitCode = 1;
});
