import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { authRouter } from "./routes/auth.routes.js";
import { loadsRouter } from "./routes/loads.routes.js";
import { carriersRouter } from "./routes/carriers.routes.js";
import { shippersRouter } from "./routes/shippers.routes.js";
import { agentsRouter } from "./routes/agents.routes.js";
import { invoicesRouter } from "./routes/invoices.routes.js";
import { documentsRouter } from "./routes/documents.routes.js";
import { trackingRouter } from "./routes/tracking.routes.js";
import { trackRouter } from "./routes/track.routes.js";
import { aiRouter } from "./routes/ai.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { pushRouter } from "./routes/push.routes.js";
import { driversRouter } from "./routes/drivers.routes.js";
import { trucksRouter } from "./routes/trucks.routes.js";
import { dqRouter } from "./routes/dq.routes.js";
import { settlementsRouter } from "./routes/settlements.routes.js";
import { networkRouter } from "./routes/network.routes.js";
import { quoteRouter } from "./routes/quote.routes.js";
import { dedicatedLanesRouter } from "./routes/dedicatedLanes.routes.js";
import { webhooksRouter } from "./routes/webhooks.routes.js";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { startCronJobs } from "./jobs/index.js";

const app = express();
app.set("trust proxy", 1);

// ----- CORS: production reads VITE_APP_URL (Railway web service URL); local dev defaults to :5173 -----
const corsOrigin =
  process.env.NODE_ENV === "production"
    ? (process.env.VITE_APP_URL ?? process.env.WEB_ORIGIN ?? "").split(",").filter(Boolean)
    : ["http://localhost:5173"];

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(compression());
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Stripe webhooks need the raw body — mount before json parser, under /api/webhooks per spec.
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhooksRouter);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ----- Health -----
app.use("/api", healthRouter);
// Legacy K8s-style probes kept for Railway's healthcheck UI compatibility.
app.get("/healthz", (_req, res) => res.json({ ok: true, service: "zulla-api" }));
app.get("/readyz", (_req, res) => res.json({ ok: true }));

// ----- API routes -----
app.use("/api/auth", authRouter);
app.use("/api/loads", loadsRouter);
app.use("/api/carriers", carriersRouter);
app.use("/api/shippers", shippersRouter);
app.use("/api/agents", agentsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/tracking", trackingRouter); // legacy tracking endpoints (events list, ping)
app.use("/api/track", trackRouter);       // public, token-based tracking page data
app.use("/api/ai", aiRouter);
app.use("/api/admin", adminRouter);
app.use("/api/push", pushRouter);
app.use("/api/drivers", driversRouter);
app.use("/api/trucks", trucksRouter);
app.use("/api/dq", dqRouter);
app.use("/api/settlements", settlementsRouter);
app.use("/api/network", networkRouter);
app.use("/api/quote", quoteRouter);
app.use("/api/dedicated-lanes", dedicatedLanesRouter);

app.use((_req, res) => res.status(404).json({ ok: false, error: { message: "Not found" } }));
app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
  if (process.env.NODE_ENV !== "test") startCronJobs();
});

export default app;
