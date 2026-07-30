const express = require("express");
const cors = require("cors");

const ordersRouter = require("./modules/orders");
const dashboardRouter = require("./modules/dashboard");
const reportsRouter = require("./modules/reports");
const productsRouter = require("./modules/products");
const staffRouter = require("./modules/staff");
const paymentsRouter = require("./modules/payments");
const { ensureDefaultUsers } = require("./bootstrap/createDefaultUsers");

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

app.post("/api/bootstrap-users", verifyToken, async (req, res) => {
  try {
    if (req.user?.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can bootstrap default users." });
    }

    await ensureDefaultUsers();
    res.json({ success: true, message: "Default users ensured." });
  } catch (error) {
    console.error("Bootstrap users failed:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to bootstrap users." });
  }
});

app.use(errorHandler);

module.exports = app;
