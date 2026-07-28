const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../utils/db");

/**
 * Fires on every create or update to an orders document.
 * Writes a notification entry for significant status changes.
 */
async function onOrderWrite(change, context) {
  const { orderId } = context.params;

  // Document deleted — nothing to do
  if (!change.after.exists) return null;

  const after = change.after.data();
  const before = change.before.exists ? change.before.data() : null;

  // New order created
  if (!before) {
    await db.collection("notifications").add({
      orderId,
      orderNo: after.orderNo,
      type: "order_placed",
      message: `New order ${after.orderNo} received from ${after.customerName}.`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    return null;
  }

  // Status changed
  if (before.status !== after.status) {
    const messages = {
      accepted: `Order ${after.orderNo} has been accepted.`,
      payment_verified: `Payment for order ${after.orderNo} has been verified.`,
      ready: `Order ${after.orderNo} is ready for pickup.`,
      completed: `Order ${after.orderNo} has been completed.`,
      rejected: `Order ${after.orderNo} was rejected.`,
      cancelled: `Order ${after.orderNo} was cancelled.`,
    };

    const message = messages[after.status];
    if (message) {
      await db.collection("notifications").add({
        orderId,
        orderNo: after.orderNo,
        type: "status_change",
        fromStatus: before.status,
        toStatus: after.status,
        message,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return null;
}

module.exports = { onOrderWrite };
