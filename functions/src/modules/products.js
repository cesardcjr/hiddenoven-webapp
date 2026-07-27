const express = require("express");
const admin = require("firebase-admin");
const { db, bucket, writeAuditLog } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const onlyAdmin = requireRole("admin");

// GET /api/products — list all products (admin view with full details)
router.get("/", onlyAdmin, async (req, res, next) => {
  try {
    const snap = await db.collection("products").get();
    const products = snap.docs.map((d) => ({ productId: d.id, ...d.data() }));
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/products — create product
router.post("/", onlyAdmin, async (req, res, next) => {
  try {
    const { name, category, price, imageBase64, mimeType, isAvailable, dailyStockLimit } = req.body;

    if (!name || !category || typeof price !== "number" || price <= 0) {
      return res.status(400).json({ error: "name, category, and a positive price are required." });
    }

    let imageUrl = "";
    if (imageBase64 && mimeType) {
      const fileName = `product_images/${Date.now()}_${name.replace(/\s+/g, "_")}`;
      const file = bucket.file(fileName);
      const buffer = Buffer.from(imageBase64, "base64");
      await file.save(buffer, { metadata: { contentType: mimeType } });
      await file.makePublic();
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }

    const ref = db.collection("products").doc();
    await ref.set({
      name: name.trim(),
      category: category.trim(),
      price,
      imageUrl,
      isAvailable: isAvailable !== false,
      dailyStockLimit: dailyStockLimit || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await writeAuditLog({ actorUid: req.user.uid, action: "product_create" });
    res.status(201).json({ productId: ref.id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id — update product
router.put("/:id", onlyAdmin, async (req, res, next) => {
  try {
    const { name, category, price, isAvailable, dailyStockLimit } = req.body;
    const ref = db.collection("products").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

    const updates = {};
    if (name) updates.name = name.trim();
    if (category) updates.category = category.trim();
    if (typeof price === "number" && price > 0) updates.price = price;
    if (typeof isAvailable === "boolean") updates.isAvailable = isAvailable;
    if (dailyStockLimit !== undefined) updates.dailyStockLimit = dailyStockLimit;
    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    await ref.update(updates);
    await writeAuditLog({ actorUid: req.user.uid, action: "product_update" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id — soft delete (mark unavailable)
router.delete("/:id", onlyAdmin, async (req, res, next) => {
  try {
    const ref = db.collection("products").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

    await ref.update({ isAvailable: false, deletedAt: admin.firestore.FieldValue.serverTimestamp() });
    await writeAuditLog({ actorUid: req.user.uid, action: "product_delete" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
