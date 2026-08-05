const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../utils/db");

const SUMMARY_REF = db.collection("dashboard_summary").doc("main");

function statusField(status) {
  return [
    "NEW",
    "PAYMENT_REVIEW",
    "PAYMENT_REJECTED",
    "PREPARING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ].includes(status)
    ? status
    : null;
}

function summaryDeltaForCreate(order) {
  const updates = {
    total: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const status = statusField(order.status);
  if (status) updates[status] = FieldValue.increment(1);
  if (order.status === "COMPLETED") {
    updates.totalRevenue = FieldValue.increment(order.total || 0);
  }
  return updates;
}

function summaryDeltaForDelete(order) {
  const updates = {
    total: FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const status = statusField(order.status);
  if (status) updates[status] = FieldValue.increment(-1);
  if (order.status === "COMPLETED") {
    updates.totalRevenue = FieldValue.increment(-(order.total || 0));
  }
  return updates;
}

function summaryDeltaForUpdate(before, after) {
  const updates = { updatedAt: FieldValue.serverTimestamp() };

  if (before.status !== after.status) {
    const beforeStatus = statusField(before.status);
    const afterStatus = statusField(after.status);
    if (beforeStatus) updates[beforeStatus] = FieldValue.increment(-1);
    if (afterStatus) updates[afterStatus] = FieldValue.increment(1);
  }

  const beforeRevenue = before.status === "COMPLETED" ? before.total || 0 : 0;
  const afterRevenue = after.status === "COMPLETED" ? after.total || 0 : 0;
  const revenueDelta = afterRevenue - beforeRevenue;
  if (revenueDelta) updates.totalRevenue = FieldValue.increment(revenueDelta);

  return updates;
}

async function updateDashboardSummary(updates) {
  await SUMMARY_REF.set(updates, { merge: true });
}

/**
 * Fires on every create or update to an orders document.
 * Writes a notification entry for significant status changes.
 */
async function onOrderWrite(change, context) {
  const { orderId } = context.params;

  // Document deleted — nothing to do
  if (!change.after.exists) {
    if (change.before.exists) {
      await updateDashboardSummary(summaryDeltaForDelete(change.before.data()));
    }
    return null;
  }

  const after = change.after.data();
  const before = change.before.exists ? change.before.data() : null;

  // New order created
  if (!before) {
    await Promise.all([
      updateDashboardSummary(summaryDeltaForCreate(after)),
      db.collection("notifications").add({
        orderId,
        orderNo: after.orderNo,
        type: "order_placed",
        message: `New order ${after.orderNo} received from ${after.customerName}.`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      }),
    ]);
    return null;
  }

  await updateDashboardSummary(summaryDeltaForUpdate(before, after));

  // Status changed
  if (before.status !== after.status) {
    const messages = {
      PREPARING: `Order ${after.orderNo} has been accepted and is being prepared.`,
      READY_FOR_PICKUP: `Order ${after.orderNo} is ready for pickup.`,
      COMPLETED: `Order ${after.orderNo} has been completed.`,
      PAYMENT_REJECTED: `Payment for order ${after.orderNo} was rejected.`,
      CANCELLED: `Order ${after.orderNo} was cancelled.`,
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
