const admin = require("firebase-admin");

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Write an audit log entry.
 */
async function writeAuditLog({ orderId = null, actorUid, action, fromStatus = null, toStatus = null }) {
  await db.collection("audit_log").add({
    orderId,
    actorUid,
    action,
    fromStatus,
    toStatus,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Generate a sequential, human-readable order number.
 * Format: HO-YYYYMMDD-XXXX (e.g. HO-20240101-0001)
 */
async function generateOrderNumber() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const counterRef = db.collection("_counters").doc(dateStr);

  const newCount = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const current = doc.exists ? doc.data().count : 0;
    const next = current + 1;
    t.set(counterRef, { count: next });
    return next;
  });

  return `HO-${dateStr}-${String(newCount).padStart(4, "0")}`;
}

module.exports = { db, bucket, writeAuditLog, generateOrderNumber };
