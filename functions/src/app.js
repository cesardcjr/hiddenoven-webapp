const express = require("express");
const cors = require("cors");

const ordersRouter = require("./modules/orders");
const dashboardRouter = require("./modules/dashboard");
const reportsRouter = require("./modules/reports");
const productsRouter = require("./modules/products");
const staffRouter = require("./modules/staff");
const paymentsRouter = require("./modules/payments");

const { verifyToken } = require("./middleware/auth");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

// Public routes
app.use("/api/orders", ordersRouter);

// Protected routes
app.use("/api/dashboard", verifyToken, dashboardRouter);
app.use("/api/reports", verifyToken, reportsRouter);
app.use("/api/products", verifyToken, productsRouter);
app.use("/api/staff", verifyToken, staffRouter);
app.use("/api/payments", verifyToken, paymentsRouter);

app.use(errorHandler);

module.exports = app;
