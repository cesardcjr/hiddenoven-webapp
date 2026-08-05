const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const {
  db,
  bucket,
  writeAuditLog,
  generateOrderNumber,
  getPaymentProofUrl,
  getPickupCounterRef,
  isActiveBookingStatus,
  adjustPickupSlotCounter,
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
    return res.status(400).json({
      error: "Payment proof is required before an order can be placed.",
    });

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

    // Fetch products and validate availability
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

    const orderNo = await generateOrderNumber();
    const orderRef = db.collection("orders").doc();

    await db.runTransaction(async (transaction) => {
      const configRef = db
        .collection("pickup_time_configs")
        .doc(pickupConfigId);
      const counterRef = getPickupCounterRef(pickupDate, pickupConfigId);
      const [configSnap, counterSnap] = await Promise.all([
        transaction.get(configRef),
        transaction.get(counterRef),
      ]);

      if (!configSnap.exists || !configSnap.data().isActive) {
        const error = new Error("Invalid or inactive pickup time slot.");
        error.status = 400;
        throw error;
      }

      const config = configSnap.data();
      let activeCount = counterSnap.exists
        ? counterSnap.data().activeCount || 0
        : null;

      if (activeCount === null) {
        const existingSnap = await transaction.get(
          db
            .collection("orders")
            .where("pickupDate", "==", pickupDate)
            .where("pickupConfigId", "==", pickupConfigId)
            .where("status", "not-in", ["CANCELLED", "PAYMENT_REJECTED"]),
        );
        activeCount = existingSnap.size;
      }

      if (activeCount >= config.maxOrders) {
        const error = new Error(
          "This time slot is fully booked for the selected date.",
        );
        error.status = 400;
        throw error;
      }

      transaction.set(orderRef, {
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
        transaction.set(itemRef, { orderId: orderRef.id, ...item });
      }

      adjustPickupSlotCounter({
        pickupDate,
        pickupConfigId,
        delta: 1,
        transaction,
      });
    });

    res
      .status(201)
      .json({ orderId: orderRef.id, orderNo, status: initialStatus });
  } catch (err) {
    next(err);
  }
});
// ─── POST /api/orders/:id/proof — Upload payment proof ───────────────────────
router.post("/with-payment", async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      pickupDate,
      pickupConfigId,
      items,
      imageBase64,
      mimeType,
      refNumber,
    } = req.body;

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
    if (!pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) {
      return res
        .status(400)
        .json({ error: "A valid pickup date (YYYY-MM-DD) is required." });
    }
    if (!pickupConfigId) {
      return res.status(400).json({ error: "A pickup time slot is required." });
    }
    if (!imageBase64 || !mimeType || !mimeType.startsWith("image/")) {
      return res.status(400).json({ error: "Payment screenshot is required." });
    }
    if (!refNumber || typeof refNumber !== "string") {
      return res
        .status(400)
        .json({ error: "A GCash/bank reference number is required." });
    }

    const proofBuffer = Buffer.from(imageBase64, "base64");
    if (proofBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Image must be under 5MB." });
    }

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

    const initialStatus = totalQty < 20 ? "PAYMENT_REVIEW" : "NEW";
    const orderNo = await generateOrderNumber();
    const orderRef = db.collection("orders").doc();
    const proofRef = db.collection("payment_proofs").doc();
    const fileName = `payment_proofs/${orderRef.id}/${Date.now()}.jpg`;
    const file = bucket.file(fileName);

    await file.save(proofBuffer, { metadata: { contentType: mimeType } });
    const imageUrl = await getPaymentProofUrl(fileName);

    await db.runTransaction(async (transaction) => {
      const configRef = db
        .collection("pickup_time_configs")
        .doc(pickupConfigId);
      const counterRef = getPickupCounterRef(pickupDate, pickupConfigId);
      const [configSnap, counterSnap] = await Promise.all([
        transaction.get(configRef),
        transaction.get(counterRef),
      ]);

      if (!configSnap.exists || !configSnap.data().isActive) {
        const error = new Error("Invalid or inactive pickup time slot.");
        error.status = 400;
        throw error;
      }

      const config = configSnap.data();
      let activeCount = counterSnap.exists
        ? counterSnap.data().activeCount || 0
        : null;

      if (activeCount === null) {
        const existingSnap = await transaction.get(
          db
            .collection("orders")
            .where("pickupDate", "==", pickupDate)
            .where("pickupConfigId", "==", pickupConfigId)
            .where("status", "not-in", ["CANCELLED", "PAYMENT_REJECTED"]),
        );
        activeCount = existingSnap.size;
      }

      if (activeCount >= config.maxOrders) {
        const error = new Error(
          "This time slot is fully booked for the selected date.",
        );
        error.status = 400;
        throw error;
      }

      transaction.set(orderRef, {
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
        transaction.set(itemRef, { orderId: orderRef.id, ...item });
      }

      transaction.set(proofRef, {
        orderId: orderRef.id,
        imageUrl,
        storagePath: fileName,
        refNumber: refNumber.trim(),
        verifiedStatus: "pending",
        verifiedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      adjustPickupSlotCounter({
        pickupDate,
        pickupConfigId,
        delta: 1,
        transaction,
      });
    });

    res.status(201).json({
      orderId: orderRef.id,
      orderNo,
      status: initialStatus,
      proofId: proofRef.id,
    });
  } catch (err) {
    next(err);
  }
});

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
    const imageUrl = await getPaymentProofUrl(fileName);

    // Write payment_proofs document
    const proofRef = db.collection("payment_proofs").doc();
    await proofRef.set({
      orderId,
      imageUrl,
      storagePath: fileName,
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
      let fromStatus;

      await db.runTransaction(async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists) {
          const error = new Error("Order not found.");
          error.status = 404;
          throw error;
        }

        const order = orderSnap.data();
        fromStatus = order.status;

        if (!isValidTransition(fromStatus, toStatus)) {
          const error = new Error(
            `Cannot transition order from '${fromStatus}' to '${toStatus}'.`,
          );
          error.status = 400;
          throw error;
        }

        const updateData = {
          status: toStatus,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (fromStatus === "PAYMENT_REVIEW" && toStatus === "PREPARING") {
          updateData.verifiedBy = actorUid;
        }

        const counterDelta =
          isActiveBookingStatus(fromStatus) && !isActiveBookingStatus(toStatus)
            ? -1
            : !isActiveBookingStatus(fromStatus) &&
                isActiveBookingStatus(toStatus)
              ? 1
              : 0;

        transaction.update(orderRef, updateData);
        if (counterDelta) {
          adjustPickupSlotCounter({
            pickupDate: order.pickupDate,
            pickupConfigId: order.pickupConfigId,
            delta: counterDelta,
            transaction,
          });
        }
      });
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
