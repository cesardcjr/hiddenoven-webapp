const express = require("express");
const cors = require("cors");

const ordersRouter = require("./modules/orders");
const dashboardRouter = require("./modules/dashboard");
const reportsRouter = require("./modules/reports");
const productsRouter = require("./modules/products");
const staffRouter = require("./modules/staff");
const paymentsRouter = require("./modules/payments");
const pickupTimesRouter = require("./modules/pickupTime");
const walkInOrdersRouter = require("./modules/walkInOrders");

const { verifyToken, requireRole } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");
const { createRateLimit } = require("./middleware/rateLimit");

const app = express();

const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "https://hiddenoven-webapp.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...configuredOrigins,
]);
const previewOrigin = /^https:\/\/hiddenoven-webapp-[a-z0-9]+-iamcesarjrs-projects\.vercel\.app$/;

function corsOrigin(origin, callback) {
  if (!origin || allowedOrigins.has(origin) || previewOrigin.test(origin)) {
    return callback(null, true);
  }
  const error = new Error("Origin is not allowed by CORS.");
  error.status = 403;
  return callback(error);
}

const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Firebase-AppCheck"],
  maxAge: 3600,
};

const publicOrderLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  keyPrefix: "public-order",
});
const trackingLimiter = createRateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  keyPrefix: "tracking",
});

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  next();
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "7mb" }));

// ── Public routes ──────────────────────────────────────────────────────────────
app.use("/api/orders/track", trackingLimiter);
app.use("/api/orders/with-payment", publicOrderLimiter);
app.use("/api/orders", ordersRouter);
app.use("/api/payment-modes", paymentsRouter);
app.use("/api/pickup-times/configs", verifyToken);
app.use("/api/pickup-times", pickupTimesRouter);

// ── Protected routes ───────────────────────────────────────────────────────────
app.use("/api/dashboard", verifyToken, requireRole("admin"), dashboardRouter);
app.use("/api/reports", verifyToken, reportsRouter);
app.use("/api/products", verifyToken, productsRouter);
app.use("/api/staff", verifyToken, staffRouter);
app.use("/api/payments", verifyToken, paymentsRouter);
app.use("/api/walk-in-orders", verifyToken, walkInOrdersRouter);

app.use(errorHandler);

module.exports = app;
