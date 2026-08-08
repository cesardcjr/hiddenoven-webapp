const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const {
  db,
  writeAuditLog,
  generateOrderNumber,
  getPHTDateString,
} = require("../utils/db");
const { requireRole } = require("../middleware/auth");
const { isValidPHMobile, validateOrderItems } = require("../utils/validate");

const router = express.Router();

router.post("/", requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const {
      customerName,
      contactNumber,
      items,
      paymentMethod = "CASH",
      paymentProvider = "",
      amountPaid,
    } = req.body;

    if (!customerName || customerName.trim().length < 2) {
      return res.status(400).json({ error: "A valid customer name is required." });
    }
    if (!isValidPHMobile(contactNumber)) {
      return res.status(400).json({ error: "A valid PH mobile number is required." });
    }
    const itemError = validateOrderItems(items);
    if (itemError) return res.status(400).json({ error: itemError });

    const normalizedMethod = String(paymentMethod).toUpperCase();
    if (!new Set(["CASH", "CASHLESS"]).has(normalizedMethod)) {
      return res.status(400).json({ error: "Payment method must be Cash or Cashless." });
    }
    if (normalizedMethod === "CASHLESS" && !String(paymentProvider).trim()) {
      return res.status(400).json({ error: "Select a cashless payment provider." });
    }

    const paidAmount = Number(amountPaid);
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      return res.status(400).json({ error: "Enter a valid amount paid." });
    }

    const orderNo = await generateOrderNumber();
    const orderRef = db.collection("orders").doc();
    const productIds = [...new Set(items.map((item) => item.productId))];
    const qtyByProduct = {};
    items.forEach((item) => {
      qtyByProduct[item.productId] = (qtyByProduct[item.productId] || 0) + item.qty;
    });

    let total = 0;
    let totalQty = 0;
    let changeAmount = 0;

    await db.runTransaction(async (transaction) => {
      const productRefs = productIds.map((id) => db.collection("products").doc(id));
      const productSnaps = await Promise.all(
        productRefs.map((ref) => transaction.get(ref)),
      );
      const stockDate = getPHTDateString();
      const products = {};
      let transactionTotal = 0;
      let transactionTotalQty = 0;

      for (const productSnap of productSnaps) {
        if (!productSnap.exists) {
          const error = new Error(`Product ${productSnap.id} not found.`);
          error.status = 400;
          throw error;
        }
        const product = productSnap.data();
        if (!product.isAvailable) {
          const error = new Error(`${product.name} is currently unavailable.`);
          error.status = 400;
          throw error;
        }
        const requestedQty = qtyByProduct[productSnap.id] || 0;
        const limit = product.dailyStockLimit || null;
        const used = product.stockDate === stockDate ? product.dailyStockUsed || 0 : 0;
        if (limit && used + requestedQty > limit) {
          const error = new Error(
            `${product.name} only has ${Math.max(0, limit - used)} left in stock today.`,
          );
          error.status = 400;
          throw error;
        }
        products[productSnap.id] = product;
      }

      const orderItems = items.map((item) => {
        const product = products[item.productId];
        const lineTotal = product.price * item.qty;
        transactionTotal += lineTotal;
        transactionTotalQty += item.qty;
        return {
          productId: item.productId,
          productName: product.name,
          qty: item.qty,
          unitPrice: product.price,
          lineTotal,
        };
      });

      if (paidAmount < transactionTotal) {
        const error = new Error("Amount paid must be at least the order total.");
        error.status = 400;
        throw error;
      }
      total = transactionTotal;
      totalQty = transactionTotalQty;
      changeAmount = paidAmount - transactionTotal;

      transaction.set(orderRef, {
        orderNo,
        customerName: customerName.trim(),
        contactNumber,
        pickupDate: stockDate,
        pickupLabel: "Walk-in",
        status: "PREPARING",
        orderType: "WALK_IN",
        subtotal: transactionTotal,
        total: transactionTotal,
        totalQty: transactionTotalQty,
        paymentMethod: normalizedMethod,
        paymentProvider:
          normalizedMethod === "CASH" ? "Cash" : String(paymentProvider).trim(),
        paymentAmount: paidAmount,
        changeAmount,
        paidAt: FieldValue.serverTimestamp(),
        paymentVerifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: req.user.uid,
        createdBy: req.user.uid,
        stockDate,
        createdAt: FieldValue.serverTimestamp(),
      });

      orderItems.forEach((item) => {
        transaction.set(db.collection("order_items").doc(), {
          orderId: orderRef.id,
          ...item,
        });
      });
      productRefs.forEach((productRef) => {
        transaction.set(
          productRef,
          {
            stockDate,
            dailyStockUsed:
              products[productRef.id].stockDate === stockDate
                ? FieldValue.increment(qtyByProduct[productRef.id] || 0)
                : qtyByProduct[productRef.id] || 0,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
    });

    await writeAuditLog({
      orderId: orderRef.id,
      orderNo,
      actorUid: req.user.uid,
      actorName: req.user.email || req.user.uid,
      action: "walk_in_order_create",
      toStatus: "PREPARING",
      details: { paymentMethod: normalizedMethod, total, totalQty },
    });

    res.status(201).json({
      orderId: orderRef.id,
      orderNo,
      status: "PREPARING",
      orderType: "WALK_IN",
      total,
      changeAmount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
