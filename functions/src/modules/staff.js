const express = require("express");
const admin = require("firebase-admin");
const { db, writeAuditLog } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const onlyAdmin = requireRole("admin");

// GET /api/staff
router.get("/", onlyAdmin, async (req, res, next) => {
  try {
    const snap = await db.collection("users").where("role", "==", "staff").get();
    const staff = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
    res.json(staff);
  } catch (err) {
    next(err);
  }
});

// POST /api/staff — create a new staff account
router.post("/", onlyAdmin, async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required." });
    }

    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });

    // Set role custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: "staff" });

    // Write to Firestore users collection
    await db.collection("users").doc(userRecord.uid).set({
      name: name.trim(),
      role: "staff",
      email: email.trim(),
      phone: phone || "",
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeAuditLog({ actorUid: req.user.uid, action: "staff_create" });
    res.status(201).json({ uid: userRecord.uid });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      return res.status(400).json({ error: "An account with this email already exists." });
    }
    next(err);
  }
});

// PUT /api/staff/:uid — update staff info
router.put("/:uid", onlyAdmin, async (req, res, next) => {
  try {
    const { name, phone, isActive } = req.body;
    const ref = db.collection("users").doc(req.params.uid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Staff member not found." });

    const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (typeof isActive === "boolean") {
      updates.isActive = isActive;
      // Disable/enable Firebase Auth account
      await admin.auth().updateUser(req.params.uid, { disabled: !isActive });
    }

    await ref.update(updates);
    await writeAuditLog({ actorUid: req.user.uid, action: "staff_update" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/staff/:uid — deactivate (never hard delete)
router.delete("/:uid", onlyAdmin, async (req, res, next) => {
  try {
    const ref = db.collection("users").doc(req.params.uid);
    await ref.update({ isActive: false, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await admin.auth().updateUser(req.params.uid, { disabled: true });
    await writeAuditLog({ actorUid: req.user.uid, action: "staff_deactivate" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
