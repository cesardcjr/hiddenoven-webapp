const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db, writeAuditLog } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// PATCH /api/payments/:id/verify
router.patch("/:id/verify", requireRole("staff", "admin"), async (req, res, next) => {
  try {
    const { id: proofId } = req.params;
    const { action } = req.body; // "verified" or "rejected"
    const actorUid = req.user.uid;

    if (!["verified", "rejected"].includes(action)) {
      return res.status(400).json({ error: "action must be 'verified' or 'rejected'." });
    }

    const proofRef = db.collection("payment_proofs").doc(proofId);
    const proofSnap = await proofRef.get();
    if (!proofSnap.exists) return res.status(404).json({ error: "Payment proof not found." });

    const { orderId } = proofSnap.data();

    await proofRef.update({
      verifiedStatus: action,
      verifiedBy: actorUid,
      verifiedAt: FieldValue.serverTimestamp(),
    });

    // Sync order status if verified
    if (action === "verified") {
      const orderRef = db.collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();
      if (orderSnap.exists && orderSnap.data().status === "accepted") {
        await orderRef.update({ status: "payment_verified", verifiedBy: actorUid });
        await writeAuditLog({
          orderId,
          actorUid,
          action: "status_change",
          fromStatus: "accepted",
          toStatus: "payment_verified",
        });
      }
    }

    await writeAuditLog({ orderId, actorUid, action: `payment_${action}` });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
