const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db, writeAuditLog, getPHTDateString } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const onlyAdmin = requireRole("admin");

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Convert "HH:MM" 24h string to total minutes from midnight
function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Shop hours: 10:00 AM – 6:00 PM (Philippine Time, UTC+8)
const SHOP_OPEN_MINUTES = 10 * 60; // 600
const SHOP_CLOSE_MINUTES = 18 * 60; // 1080
const SLOT_DURATION = 30; // minutes
const PH_OFFSET_MS = 8 * 3600000; // UTC+8 in ms

function nowPHT() {
  return new Date(Date.now() + PH_OFFSET_MS);
}

/**
 * Given the current Philippine time, return the earliest available pickup date
 * and the minimum start time (minutes from midnight) on that date.
 *
 * Rules:
 *  - Order placed 12:00 AM – 11:59 AM  → same day, slots from 12:00 PM onwards
 *  - Order placed 12:00 PM – 11:59 PM  → next day,  slots from 10:00 AM onwards
 */
function getEarliestWindow() {
  const pht = nowPHT();
  const hourPHT = pht.getUTCHours(); // correct because we offset manually
  const minPHT = pht.getUTCMinutes();
  const totalMin = hourPHT * 60 + minPHT;

  let date;
  let minStartMinutes;

  if (totalMin < 12 * 60) {
    // Before noon → same day, from 12:00 PM
    date = pht;
    minStartMinutes = 12 * 60;
  } else {
    // Noon or after → next day, from 10:00 AM
    date = new Date(pht.getTime() + 86400000);
    minStartMinutes = SHOP_OPEN_MINUTES;
  }

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return { dateStr: `${yyyy}-${mm}-${dd}`, minStartMinutes };
}

// ─── GET /api/pickup-times/configs — list all configs (admin) ────────────────
router.get("/configs", onlyAdmin, async (req, res, next) => {
  try {
    const snap = await db
      .collection("pickup_time_configs")
      .orderBy("startMinutes", "asc")
      .get();
    const today = getPHTDateString();
    const counterSnap = await db
      .collection("pickup_slot_counters")
      .where("pickupDate", "==", today)
      .get();
    const counts = {};
    counterSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.pickupConfigId) counts[data.pickupConfigId] = data.activeCount || 0;
    });
    const configs = snap.docs.map((d) => {
      const data = d.data();
      const bookedToday = counts[d.id] || 0;
      return {
        configId: d.id,
        ...data,
        bookedToday,
        remainingToday: Math.max(0, (data.maxOrders || 0) - bookedToday),
      };
    });
    res.json(configs);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/pickup-times/configs — create a time slot config ──────────────
router.post("/configs", onlyAdmin, async (req, res, next) => {
  try {
    const { startTime, maxOrders } = req.body;

    if (!startTime || typeof startTime !== "string") {
      return res
        .status(400)
        .json({ error: "startTime is required (HH:MM, 24h)." });
    }
    if (!Number.isInteger(maxOrders) || maxOrders < 1) {
      return res
        .status(400)
        .json({ error: "maxOrders must be a positive integer." });
    }

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = startMinutes + SLOT_DURATION;

    if (startMinutes < SHOP_OPEN_MINUTES || endMinutes > SHOP_CLOSE_MINUTES) {
      return res.status(400).json({
        error: `Slot must fall within shop hours (10:00 AM – 6:00 PM). Got ${startTime}.`,
      });
    }

    // Prevent duplicate start times
    const existing = await db
      .collection("pickup_time_configs")
      .where("startMinutes", "==", startMinutes)
      .get();
    if (!existing.empty) {
      return res
        .status(400)
        .json({ error: "A slot starting at this time already exists." });
    }

    // Format display label: "9:00 AM – 9:30 AM"
    function fmtMin(m) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
    }
    const label = `${fmtMin(startMinutes)} – ${fmtMin(endMinutes)}`;

    const ref = db.collection("pickup_time_configs").doc();
    await ref.set({
      startTime,
      startMinutes,
      endMinutes,
      label,
      maxOrders,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    await writeAuditLog({
      actorUid: req.user.uid,
      action: "pickup_time_create",
    });
    res.status(201).json({ configId: ref.id, label });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/pickup-times/configs/:id — update a config ─────────────────────
router.put("/configs/:id", onlyAdmin, async (req, res, next) => {
  try {
    const ref = db.collection("pickup_time_configs").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists)
      return res.status(404).json({ error: "Config not found." });

    const { maxOrders, isActive } = req.body;
    const updates = { updatedAt: FieldValue.serverTimestamp() };

    if (Number.isInteger(maxOrders) && maxOrders >= 1)
      updates.maxOrders = maxOrders;
    if (typeof isActive === "boolean") updates.isActive = isActive;

    await ref.update(updates);
    await writeAuditLog({
      actorUid: req.user.uid,
      action: "pickup_time_update",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/pickup-times/configs/:id — soft delete (deactivate) ─────────
router.delete("/configs/:id", onlyAdmin, async (req, res, next) => {
  try {
    const ref = db.collection("pickup_time_configs").doc(req.params.id);
    await ref.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await writeAuditLog({
      actorUid: req.user.uid,
      action: "pickup_time_delete",
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pickup-times/available?date=YYYY-MM-DD — public ────────────────
// Returns active configs that still have capacity for the given date,
// filtered by the ordering-time availability rules.
router.get("/available", async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "date query param required (YYYY-MM-DD)." });
    }

    const { dateStr: earliestDate, minStartMinutes } = getEarliestWindow();

    // Reject dates before the earliest available date
    if (date < earliestDate) {
      return res.json([]);
    }

    // Get all active configs
    const configSnap = await db
      .collection("pickup_time_configs")
      .where("isActive", "==", true)
      .orderBy("startMinutes", "asc")
      .get();

    if (configSnap.empty) return res.json([]);

    // Count existing orders per config for the requested date
    // (using pickupDate field stored on the order)
    const orderSnap = await db
      .collection("orders")
      .where("pickupDate", "==", date)
      .where("status", "not-in", ["CANCELLED", "PAYMENT_REJECTED"])
      .get();

    const orderCounts = {};
    orderSnap.docs.forEach((d) => {
      const cid = d.data().pickupConfigId;
      if (cid) orderCounts[cid] = (orderCounts[cid] || 0) + 1;
    });

    const available = configSnap.docs
      .map((d) => ({ configId: d.id, ...d.data() }))
      .filter((cfg) => {
        // On the earliest date, only show slots at or after the minimum start time
        if (date === earliestDate && cfg.startMinutes < minStartMinutes)
          return false;
        // Hide fully-booked slots
        const used = orderCounts[cfg.configId] || 0;
        return used < cfg.maxOrders;
      })
      .map((cfg) => ({
        configId: cfg.configId,
        label: cfg.label,
        startTime: cfg.startTime,
        startMinutes: cfg.startMinutes,
        maxOrders: cfg.maxOrders,
        booked: orderCounts[cfg.configId] || 0,
        remaining: cfg.maxOrders - (orderCounts[cfg.configId] || 0),
      }));

    res.json(available);
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/pickup-times/available-dates — public ──────────────────────────
// Returns the earliest and latest selectable pickup dates for the date picker.
router.get("/available-dates", async (req, res, next) => {
  try {
    const { dateStr: earliestDate } = getEarliestWindow();

    // Allow booking up to 14 days ahead
    const latest = new Date(Date.now() + PH_OFFSET_MS + 14 * 86400000);
    const latestDate = `${latest.getUTCFullYear()}-${String(latest.getUTCMonth() + 1).padStart(2, "0")}-${String(latest.getUTCDate()).padStart(2, "0")}`;

    res.json({ earliestDate, latestDate });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
