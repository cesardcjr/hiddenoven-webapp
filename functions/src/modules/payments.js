const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const {
  db,
  bucket,
  getPublicUrl,
  writeAuditLog,
  adjustPickupSlotCounter,
} = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

function decodeQrImage(imageBase64, mimeType) {
  if (!imageBase64 || !mimeType) return null;
  if (!mimeType.startsWith("image/")) {
    const error = new Error("QR code must be an image file.");
    error.status = 400;
    throw error;
  }

  const buffer = Buffer.from(imageBase64, "base64");
  if (buffer.length > 5 * 1024 * 1024) {
    const error = new Error("QR code image must be under 5MB.");
    error.status = 400;
    throw error;
  }

  return buffer;
}

function validatePaymentMode({ provider, accountNumber }) {
  if (!provider || typeof provider !== "string" || provider.trim().length < 2) {
    return "Bank or service provider is required.";
  }
  if (
    !accountNumber ||
    typeof accountNumber !== "string" ||
    accountNumber.trim().length < 3
  ) {
    return "Account number is required.";
  }
  return null;
}

async function uploadQrCode(modeId, imageBase64, mimeType) {
  const buffer = decodeQrImage(imageBase64, mimeType);
  if (!buffer) return null;

  const ext = mimeType.includes("png") ? "png" : "jpg";
  const fileName = `payment_mode_qrs/${modeId}/${Date.now()}.${ext}`;
  const file = bucket.file(fileName);
  await file.save(buffer, { metadata: { contentType: mimeType } });
  await file.makePublic();
  return {
    qrImageUrl: getPublicUrl(fileName),
    qrStoragePath: fileName,
  };
}

// GET /api/payment-modes - list active payment modes for customers
router.get("/", async (req, res, next) => {
  try {
    const snap = await db
      .collection("payment_modes")
      .where("isActive", "==", true)
      .orderBy("createdAt", "asc")
      .get();

    res.json(snap.docs.map((d) => ({ modeId: d.id, ...d.data() })));
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/modes - list all payment modes for admins
router.get("/modes", requireRole("admin"), async (req, res, next) => {
  try {
    const snap = await db
      .collection("payment_modes")
      .orderBy("createdAt", "desc")
      .get();

    res.json(snap.docs.map((d) => ({ modeId: d.id, ...d.data() })));
  } catch (err) {
    next(err);
  }
});

// POST /api/payments/modes - create payment mode
router.post("/modes", requireRole("admin"), async (req, res, next) => {
  try {
    const {
      provider,
      accountNumber,
      accountName = "",
      imageBase64,
      mimeType,
      isActive = true,
    } = req.body;

    const validationError = validatePaymentMode({ provider, accountNumber });
    if (validationError) return res.status(400).json({ error: validationError });

    const ref = db.collection("payment_modes").doc();
    const qrData = await uploadQrCode(ref.id, imageBase64, mimeType);

    await ref.set({
      provider: provider.trim(),
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim(),
      ...(qrData || {}),
      isActive: isActive !== false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actorUid: req.user.uid,
      action: "payment_mode_create",
    });
    res.status(201).json({ modeId: ref.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/payments/modes/:id - update payment mode
router.put("/modes/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const ref = db.collection("payment_modes").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ error: "Payment mode not found." });

    const {
      provider,
      accountNumber,
      accountName,
      imageBase64,
      mimeType,
      isActive,
    } = req.body;
    const updates = { updatedAt: FieldValue.serverTimestamp() };

    if (provider !== undefined) {
      if (!provider || provider.trim().length < 2) {
        return res
          .status(400)
          .json({ error: "Bank or service provider is required." });
      }
      updates.provider = provider.trim();
    }

    if (accountNumber !== undefined) {
      if (!accountNumber || accountNumber.trim().length < 3) {
        return res.status(400).json({ error: "Account number is required." });
      }
      updates.accountNumber = accountNumber.trim();
    }

    if (accountName !== undefined) updates.accountName = accountName.trim();
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const qrData = await uploadQrCode(ref.id, imageBase64, mimeType);
    if (qrData) Object.assign(updates, qrData);

    await ref.update(updates);
    await writeAuditLog({
      actorUid: req.user.uid,
      action: "payment_mode_update",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/payments/modes/:id - soft delete payment mode
router.delete("/modes/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const ref = db.collection("payment_modes").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ error: "Payment mode not found." });

    await ref.update({
      isActive: false,
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: req.user.uid,
      action: "payment_mode_delete",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/payments/:id/verify
router.patch(
  "/:id/verify",
  requireRole("staff", "admin"),
  async (req, res, next) => {
    try {
      const { id: proofId } = req.params;
      const { action } = req.body; // "verified" or "rejected"
      const actorUid = req.user.uid;

      if (!["verified", "rejected"].includes(action)) {
        return res
          .status(400)
          .json({ error: "action must be 'verified' or 'rejected'." });
      }

      const proofRef = db.collection("payment_proofs").doc(proofId);
      let orderId;
      let statusChange = null;

      await db.runTransaction(async (transaction) => {
        const proofSnap = await transaction.get(proofRef);
        if (!proofSnap.exists) {
          const error = new Error("Payment proof not found.");
          error.status = 404;
          throw error;
        }

        const proof = proofSnap.data();
        if (proof.verifiedStatus !== "pending") {
          const error = new Error("Payment proof has already been reviewed.");
          error.status = 409;
          throw error;
        }

        orderId = proof.orderId;
        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await transaction.get(orderRef);

        transaction.update(proofRef, {
          verifiedStatus: action,
          verifiedBy: actorUid,
          verifiedAt: FieldValue.serverTimestamp(),
        });

        if (orderSnap.exists && orderSnap.data().status === "PAYMENT_REVIEW") {
          const order = orderSnap.data();
          const toStatus = action === "verified" ? "PREPARING" : "PAYMENT_REJECTED";
          const updateData = {
            status: toStatus,
            updatedAt: FieldValue.serverTimestamp(),
          };

          if (action === "verified") {
            updateData.verifiedBy = actorUid;
          } else {
            adjustPickupSlotCounter({
              pickupDate: order.pickupDate,
              pickupConfigId: order.pickupConfigId,
              delta: -1,
              transaction,
            });
          }

          transaction.update(orderRef, updateData);
          statusChange = {
            fromStatus: "PAYMENT_REVIEW",
            toStatus,
          };
        }
      });

      if (statusChange) {
        await writeAuditLog({
          orderId,
          actorUid,
          action: "status_change",
          fromStatus: statusChange.fromStatus,
          toStatus: statusChange.toStatus,
        });
      }

      await writeAuditLog({ orderId, actorUid, action: `payment_${action}` });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
