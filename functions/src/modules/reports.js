const express = require("express");
const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

function parsePHTDateRange(from, to) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return null;
  }

  const fromDate = new Date(`${from}T00:00:00+08:00`);
  const toDate = new Date(`${to}T23:59:59.999+08:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }
  return { fromDate, toDate };
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "from and to date query params are required (YYYY-MM-DD).",
      });
    }

    const range = parsePHTDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: "Invalid date format." });
    }
    const { fromDate, toDate } = range;

    const [ordersSnap, sourceOrdersSnap] = await Promise.all([
      db
        .collection("orders")
        .where("status", "==", "COMPLETED")
        .where("createdAt", ">=", Timestamp.fromDate(fromDate))
        .where("createdAt", "<=", Timestamp.fromDate(toDate))
        .get(),
      db
        .collection("orders")
        .where("createdAt", ">=", Timestamp.fromDate(fromDate))
        .where("createdAt", "<=", Timestamp.fromDate(toDate))
        .get(),
    ]);

    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const sourceOrders = sourceOrdersSnap.docs.map((d) => d.data());
    const walkInOrderCount = sourceOrders.filter(
      (order) => order.orderType === "WALK_IN",
    ).length;
    const onlineOrderCount = sourceOrders.length - walkInOrderCount;

    const productCounts = {};
    const qtyByOrder = {};

    for (const orderIds of chunkArray(
      orders.map((order) => order.id),
      10,
    )) {
      const itemsSnap = await db
        .collection("order_items")
        .where("orderId", "in", orderIds)
        .get();

      for (const item of itemsSnap.docs) {
        const { orderId, productId, productName, qty, lineTotal } = item.data();
        qtyByOrder[orderId] = (qtyByOrder[orderId] || 0) + qty;
        if (!productCounts[productId]) {
          productCounts[productId] = { productName, qty: 0, revenue: 0 };
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
    const transactions = orders
      .map((order) => ({
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        contactNumber: order.contactNumber,
        orderDate: order.createdAt,
        paidAt: order.paidAt || null,
        pickedUpAt: order.pickedUpAt || null,
        total: order.total || 0,
        totalQty: qtyByOrder[order.id] || 0,
        orderType: order.orderType || "ONLINE",
      }))
      .sort((a, b) => {
        const aTime = a.orderDate?.toMillis?.() || 0;
        const bTime = b.orderDate?.toMillis?.() || 0;
        return bTime - aTime;
      });

    res.json({
      from,
      to,
      orderCount: orders.length,
      walkInOrderCount,
      onlineOrderCount,
      totalRevenue,
      topProducts,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
