const express = require("express");
const { Timestamp } = require("firebase-admin/firestore");
const { db } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

function parsePHTDateRange(from, to) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const fromDate = new Date(`${from}T00:00:00+08:00`);
  const toDate = new Date(`${to}T23:59:59.999+08:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) return null;
  return { fromDate, toDate };
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) chunks.push(values.slice(i, i + size));
  return chunks;
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value._seconds === "number") return value._seconds * 1000;
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isWithinRange(value, fromDate, toDate) {
  const time = timestampMillis(value);
  return time >= fromDate.getTime() && time <= toDate.getTime();
}

function handlerUidFor(order) {
  return order.pickedUpBy || order.verifiedBy || order.acceptedBy || order.paymentCapturedBy || order.createdBy || null;
}

// GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to date query params are required (YYYY-MM-DD)." });
    const range = parsePHTDateRange(from, to);
    if (!range) return res.status(400).json({ error: "Invalid date range." });
    const { fromDate, toDate } = range;

    const [completedSnap, sourceOrdersSnap] = await Promise.all([
      db.collection("orders").where("status", "==", "COMPLETED").get(),
      db.collection("orders").where("createdAt", ">=", Timestamp.fromDate(fromDate)).where("createdAt", "<=", Timestamp.fromDate(toDate)).get(),
    ]);

    const orders = completedSnap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((order) => isWithinRange(order.pickedUpAt || order.updatedAt || order.createdAt, fromDate, toDate));
    const sourceOrders = sourceOrdersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const totalOrderCount = sourceOrders.length;
    const cancelledOrderCount = sourceOrders.filter((order) => order.status === "CANCELLED").length;
    const walkInOrderCount = sourceOrders.filter((order) => order.orderType === "WALK_IN").length;
    const onlineOrderCount = totalOrderCount - walkInOrderCount;

    const productCounts = {};
    const itemsByOrder = {};
    const proofsByOrder = {};
    const orderIds = orders.map((order) => order.id);

    for (const ids of chunkArray(orderIds, 10)) {
      const [itemsSnap, proofsSnap] = await Promise.all([
        db.collection("order_items").where("orderId", "in", ids).get(),
        db.collection("payment_proofs").where("orderId", "in", ids).get(),
      ]);
      itemsSnap.docs.forEach((doc) => {
        const item = doc.data();
        if (!itemsByOrder[item.orderId]) itemsByOrder[item.orderId] = [];
        itemsByOrder[item.orderId].push({
          productId: item.productId,
          productName: item.productName || item.name || "Product",
          qty: Number(item.qty || item.quantity || 0),
          unitPrice: Number(item.unitPrice || item.price || 0),
          lineTotal: Number(item.lineTotal || item.subtotal || 0),
        });
        if (!productCounts[item.productId]) productCounts[item.productId] = { productName: item.productName || item.name || "Product", qty: 0, revenue: 0 };
        productCounts[item.productId].qty += Number(item.qty || item.quantity || 0);
        productCounts[item.productId].revenue += Number(item.lineTotal || item.subtotal || 0);
      });
      proofsSnap.docs.forEach((doc) => {
        const proof = { proofId: doc.id, ...doc.data() };
        const current = proofsByOrder[proof.orderId];
        if (!current || timestampMillis(proof.createdAt) > timestampMillis(current.createdAt)) proofsByOrder[proof.orderId] = proof;
      });
    }

    const handlerIds = [...new Set(orders.map(handlerUidFor).filter(Boolean))];
    const handlerNames = {};
    for (const ids of chunkArray(handlerIds, 100)) {
      const snapshots = await db.getAll(...ids.map((uid) => db.collection("users").doc(uid)));
      snapshots.forEach((snapshot) => {
        if (snapshot.exists) handlerNames[snapshot.id] = snapshot.data().name || snapshot.data().email || snapshot.id;
      });
    }

    const topProducts = Object.entries(productCounts)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const transactions = orders.map((order) => {
      const proof = proofsByOrder[order.id] || {};
      const handlerUid = handlerUidFor(order);
      const items = itemsByOrder[order.id] || [];
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        customerName: order.customerName,
        contactNumber: order.contactNumber,
        orderDate: order.createdAt,
        completedAt: order.pickedUpAt || order.updatedAt || order.createdAt,
        paidAt: order.paidAt || proof.createdAt || null,
        pickedUpAt: order.pickedUpAt || null,
        total: Number(order.total || 0),
        totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        orderType: order.orderType || "ONLINE",
        paymentMethod: order.paymentMethod || (order.orderType === "WALK_IN" ? "CASH" : "CASHLESS"),
        paymentProvider: order.paymentProvider || proof.paymentProvider || "—",
        paymentReference: order.paymentRefNumber || proof.refNumber || "—",
        paymentAmount: Number(order.paymentAmount ?? proof.amount ?? order.total ?? 0),
        paymentStatus: proof.verifiedStatus || (order.verifiedBy ? "VERIFIED" : "PAID"),
        items,
        itemsSummary: items.map((item) => `${item.productName} x${item.qty}`).join("; "),
        handledByUid: handlerUid,
        handledByName: handlerNames[handlerUid] || order.handlerName || order.staffName || "—",
      };
    }).sort((a, b) => timestampMillis(b.completedAt) - timestampMillis(a.completedAt));

    res.json({
      from,
      to,
      orderCount: orders.length,
      totalOrderCount,
      cancelledOrderCount,
      walkInOrderCount,
      onlineOrderCount,
      totalRevenue,
      topProducts,
      transactions,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
