const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const db = admin.firestore();
const bucket = admin.storage().bucket();

const ACTIVE_BOOKING_STATUSES = new Set([
  "NEW",
  "PAYMENT_REVIEW",
  "PREPARING",
  "READY_FOR_PICKUP",
  "COMPLETED",
]);

/**
 * Build a public download URL for a file in the configured bucket.
 * Uses the Storage Emulator's REST endpoint when running locally
 * (production storage.googleapis.com URLs aren't reachable there),
 * and the standard public URL in production.
 */
function getPublicUrl(fileName) {
  const encodedPath = encodeURIComponent(fileName);
  if (process.env.STORAGE_EMULATOR_HOST) {
    return `${process.env.STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;
  }
  return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
}

async function getPaymentProofUrl(fileName) {
  if (process.env.STORAGE_EMULATOR_HOST) {
    return getPublicUrl(fileName);
  }

  const [url] = await bucket.file(fileName).getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return url;
}

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
    timestamp: FieldValue.serverTimestamp(),
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

function getPickupCounterRef(pickupDate, pickupConfigId) {
  return db
    .collection("pickup_slot_counters")
    .doc(`${pickupDate}_${pickupConfigId}`);
}

function isActiveBookingStatus(status) {
  return ACTIVE_BOOKING_STATUSES.has(status);
}

async function adjustPickupSlotCounter({
  pickupDate,
  pickupConfigId,
  delta,
  transaction = null,
}) {
  if (!pickupDate || !pickupConfigId || !delta) return;

  const ref = getPickupCounterRef(pickupDate, pickupConfigId);
  const update = {
    pickupDate,
    pickupConfigId,
    activeCount: FieldValue.increment(delta),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (transaction) {
    transaction.set(ref, update, { merge: true });
    return;
  }

  await ref.set(update, { merge: true });
}

module.exports = {
  db,
  bucket,
  writeAuditLog,
  generateOrderNumber,
  getPublicUrl,
  getPaymentProofUrl,
  getPickupCounterRef,
  isActiveBookingStatus,
  adjustPickupSlotCounter,
};
