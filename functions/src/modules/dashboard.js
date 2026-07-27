const express = require("express");
const { db } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard/summary
router.get("/summary", requireRole("admin"), async (req, res, next) => {
  try {
    const ordersSnap = await db.collection("orders").get();
    const orders = ordersSnap.docs.map((d) => d.data());

    const summary = {
      total: orders.length,
      pending: 0,
      accepted: 0,
      payment_verified: 0,
      ready: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    for (const order of orders) {
      if (summary[order.status] !== undefined) summary[order.status]++;
      if (order.status === "completed") summary.totalRevenue += order.total || 0;
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
