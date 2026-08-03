const express = require("express");
const { db } = require("../utils/db");

const router = express.Router();

// GET /api/dashboard/summary
router.get("/summary", async (req, res, next) => {
  try {
    const ordersSnap = await db.collection("orders").get();
    const orders = ordersSnap.docs.map((d) => d.data());

    const summary = {
      total: orders.length,
      NEW: 0,
      PAYMENT_REVIEW: 0,
      PAYMENT_REJECTED: 0,
      PREPARING: 0,
      READY_FOR_PICKUP: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      totalRevenue: 0,
    };

    for (const order of orders) {
      if (summary[order.status] !== undefined) summary[order.status]++;
      if (order.status === "COMPLETED")
        summary.totalRevenue += order.total || 0;
    }

    // Convenience aliases the frontend KPI cards expect
    res.json({
      ...summary,
      pending: summary.NEW + summary.PAYMENT_REVIEW + summary.PAYMENT_REJECTED,
      completed: summary.COMPLETED,
      cancelled: summary.CANCELLED,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
