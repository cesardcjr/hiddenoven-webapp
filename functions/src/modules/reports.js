const express = require("express");
const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "from and to date query params are required (YYYY-MM-DD).",
      });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    const ordersSnap = await db
      .collection("orders")
      .where("status", "==", "COMPLETED")
      .where("createdAt", ">=", Timestamp.fromDate(fromDate))
      .where("createdAt", "<=", Timestamp.fromDate(toDate))
      .get();

    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Aggregate top products
    const productCounts = {};
    for (const order of orders) {
      const itemsSnap = await db
        .collection("order_items")
        .where("orderId", "==", order.id)
        .get();
      for (const item of itemsSnap.docs) {
        const { productId, qty, lineTotal } = item.data();
        if (!productCounts[productId]) {
          productCounts[productId] = { qty: 0, revenue: 0 };
        }
        productCounts[productId].qty += qty;
        productCounts[productId].revenue += lineTotal;
      }
    }

    const topProducts = Object.entries(productCounts)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    res.json({
      from,
      to,
      orderCount: orders.length,
      totalRevenue,
      topProducts,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
