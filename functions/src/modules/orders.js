const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const {
  db,
  bucket,
  writeAuditLog,
  generateOrderNumber,
  getPublicUrl,
} = require("../utils/db");
const {
  isValidPHMobile,
  validateOrderItems,
  isValidTransition,
} = require("../utils/validate");
const { verifyToken, requireRole } = require("../middleware/auth");

const router = express.Router();

// ─── POST /api/orders — Place a new order ────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { customerName, contactNumber, items } = req.body;

    if (
      !customerName ||
      typeof customerName !== "string" ||
      customerName.trim().length < 2
    ) {
      return res
        .status(400)
        .json({ error: "A valid customer name is required." });
    }
    if (!isValidPHMobile(contactNumber)) {
      return res.status(400).json({
        error: "A valid PH mobile number is required (e.g. 09XXXXXXXXX).",
      });
    }
    const itemError = validateOrderItems(items);
    if (itemError) return res.status(400).json({ error: itemError });

    // Validate pickup slot config + date
    const pickupDateFromBody = req.body.pickupDate;
    const pickupConfigIdFromBody = req.body.pickupConfigId;

    if (
      !pickupDateFromBody ||
      !/^\d{4}-\d{2}-\d{2}$/.test(pickupDateFromBody)
    ) {
      return res
        .status(400)
        .json({ error: "A valid pickup date (YYYY-MM-DD) is required." });
    }
    if (!pickupConfigIdFromBody) {
      return res.status(400).json({ error: "A pickup time slot is required." });
    }

    const pickupDate = pickupDateFromBody;
    const pickupConfigId = pickupConfigIdFromBody;

    const configRef = db.collection("pickup_time_configs").doc(pickupConfigId);
    const configSnap = await configRef.get();
    if (!configSnap.exists || !configSnap.data().isActive) {
      return res
        .status(400)
        .json({ error: "Invalid or inactive pickup time slot." });
    }
    const config = configSnap.data();

    // Count existing non-cancelled orders for this date+config
    const existingSnap = await db
      .collection("orders")
      .where("pickupDate", "==", pickupDate)
      .where("pickupConfigId", "==", pickupConfigId)
      .where("status", "not-in", ["CANCELLED", "PAYMENT_REJECTED"])
      .get();
    if (existingSnap.size >= config.maxOrders) {
      return res.status(400).json({
        error: "This time slot is fully booked for the selected date.",
      });
    }

    // Fetch products and validate stock
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productSnaps = await Promise.all(
      productIds.map((id) => db.collection("products").doc(id).get()),
    );
    const productMap = {};
    for (const snap of productSnaps) {
      if (!snap.exists)
        return res.status(400).json({ error: `Product ${snap.id} not found.` });
      const data = snap.data();
      if (!data.isAvailable)
        return res
          .status(400)
          .json({ error: `${data.name} is currently unavailable.` });
      productMap[snap.id] = data;
    }

    // Compute totals server-side
    let subtotal = 0;
    let totalQty = 0;
    const orderItemsData = items.map((item) => {
      const product = productMap[item.productId];
      const lineTotal = product.price * item.qty;
      subtotal += lineTotal;
      totalQty += item.qty;
      return {
        productId: item.productId,
        productName: product.name,
        qty: item.qty,
        unitPrice: product.price,
        lineTotal,
      };
    });

    // Auto-accept rule: total qty < 20 skips NEW → goes straight to PAYMENT_REVIEW
    const initialStatus = totalQty < 20 ? "PAYMENT_REVIEW" : "NEW";

    // Atomic write
    const orderNo = await generateOrderNumber();
    const orderRef = db.collection("orders").doc();
    const batch = db.batch();

    batch.set(orderRef, {
      orderNo,
      customerName: customerName.trim(),
      contactNumber,
      pickupDate,
      pickupConfigId,
      pickupLabel: config.label,
      status: initialStatus,
      subtotal,
      total: subtotal,
      createdAt: FieldValue.serverTimestamp(),
      verifiedBy: null,
    });
    for (const item of orderItemsData) {
      const itemRef = db.collection("order_items").doc();
      batch.set(itemRef, { orderId: orderRef.id, ...item });
    }

    await batch.commit();

    res
      .status(201)
      .json({ orderId: orderRef.id, orderNo, status: initialStatus });
  } catch (err) {
    next(err);
  }
});
// ─── POST /api/orders/:id/proof — Upload payment proof ───────────────────────
router.post("/:id/proof", async (req, res, next) => {
  try {
    const { id: orderId } = req.params;
    const { imageBase64, mimeType, refNumber } = req.body;

    if (!imageBase64 || !mimeType || !mimeType.startsWith("image/")) {
      return res.status(400).json({ error: "A valid image file is required." });
    }
    if (!refNumber || typeof refNumber !== "string") {
      return res
        .status(400)
        .json({ error: "A GCash/bank reference number is required." });
    }

    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists)
      return res.status(404).json({ error: "Order not found." });

    // Upload to Cloud Storage
    const fileName = `payment_proofs/${orderId}/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    const buffer = Buffer.from(imageBase64, "base64");

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Image must be under 5MB." });
    }

    await file.save(buffer, { metadata: { contentType: mimeType } });
    await file.makePublic();
    const imageUrl = getPublicUrl(fileName);

    // Write payment_proofs document
    const proofRef = db.collection("payment_proofs").doc();
    await proofRef.set({
      orderId,
      imageUrl,
      refNumber: refNumber.trim(),
      verifiedStatus: "pending",
      verifiedBy: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ proofId: proofRef.id, imageUrl });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/track — Track order (public) ────────────────────────────
router.get("/track", async (req, res, next) => {
  try {
    const { orderNo, contactNumber, customerName } = req.query;

    let query;

    if (orderNo) {
      query = db.collection("orders").where("orderNo", "==", orderNo);
    } else if (contactNumber && customerName) {
      query = db
        .collection("orders")
        .where("contactNumber", "==", contactNumber)
        .where("customerName", "==", customerName)
        .orderBy("createdAt", "desc")
        .limit(5);
    } else {
      return res
        .status(400)
        .json({ error: "Provide orderNo, or contactNumber + customerName." });
    }

    const snap = await query.get();
    if (snap.empty) return res.status(404).json({ error: "No orders found." });

    const orders = snap.docs.map((d) => ({ orderId: d.id, ...d.data() }));
    res.json(orderNo ? orders[0] : orders);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/orders/:id/status — Staff status transition ──────────────────
router.patch(
  "/:id/status",
  verifyToken,
  requireRole("staff", "admin"),
  async (req, res, next) => {
    try {
      const { id: orderId } = req.params;
      const { status: toStatus } = req.body;
      const actorUid = req.user.uid;

      if (!toStatus)
        return res.status(400).json({ error: "New status is required." });

      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (!orderSnap.exists)
        return res.status(404).json({ error: "Order not found." });

      const { status: fromStatus } = orderSnap.data();

      if (!isValidTransition(fromStatus, toStatus)) {
        return res.status(400).json({
          error: `Cannot transition order from '${fromStatus}' to '${toStatus}'.`,
        });
      }

      const updateData = {
        status: toStatus,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (toStatus === "payment_verified") updateData.verifiedBy = actorUid;

      await orderRef.update(updateData);
      await writeAuditLog({
        orderId,
        actorUid,
        action: "status_change",
        fromStatus,
        toStatus,
      });

      res.json({ success: true, orderId, fromStatus, toStatus });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
