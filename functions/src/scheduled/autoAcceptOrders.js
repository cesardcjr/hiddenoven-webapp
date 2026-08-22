const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { db, writeAuditLog } = require("../utils/db");

const AUTO_ACCEPT_AFTER_MS = 30 * 60 * 1000;

async function autoAcceptStaleOrders() {
  const cutoff = Timestamp.fromMillis(Date.now() - AUTO_ACCEPT_AFTER_MS);
  const snapshot = await db
    .collection("orders")
    .where("status", "==", "NEW")
    .where("createdAt", "<=", cutoff)
    .orderBy("createdAt", "asc")
    .limit(100)
    .get();

  const accepted = await Promise.all(snapshot.docs.map(async (orderSnapshot) => {
    const result = await db.runTransaction(async (transaction) => {
      const freshSnapshot = await transaction.get(orderSnapshot.ref);
      if (!freshSnapshot.exists || freshSnapshot.data().status !== "NEW") return null;
      const order = freshSnapshot.data();
      transaction.update(orderSnapshot.ref, {
        status: "PAYMENT_REVIEW",
        autoAccepted: true,
        autoAcceptedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { orderId: orderSnapshot.id, orderNo: order.orderNo };
    });

    if (result) {
      await writeAuditLog({
        orderId: result.orderId,
        orderNo: result.orderNo,
        actorUid: "system",
        actorName: "Automatic acceptance",
        action: "order_auto_accept",
        fromStatus: "NEW",
        toStatus: "PAYMENT_REVIEW",
        details: { unattendedMinutes: 30 },
      });
    }
    return result;
  }));

  return { accepted: accepted.filter(Boolean).length };
}

module.exports = { autoAcceptStaleOrders, AUTO_ACCEPT_AFTER_MS };
