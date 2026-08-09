const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db, bucket, writeAuditLog, getPublicUrl, getPHTDateString } = require("../utils/db");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
const onlyAdmin = requireRole("admin");
const staffOrAdmin = requireRole("staff", "admin");
const IMAGE_FITS = new Set(["cover", "contain"]);
const IMAGE_POSITIONS = new Set(["center", "top", "bottom", "left", "right"]);

function normalizeImageFit(value) {
  return IMAGE_FITS.has(value) ? value : "cover";
}

function normalizeImagePosition(value) {
  return IMAGE_POSITIONS.has(value) ? value : "center";
}

// GET /api/products — list all products (admin view with full details)
router.get("/", staffOrAdmin, async (req, res, next) => {
  try {
    const snap = await db.collection("products").get();
    const today = getPHTDateString();
    const products = snap.docs.map((d) => {
      const data = d.data();
      const dailyStockLimit = data.dailyStockLimit || null;
      const dailyStockUsed = data.stockDate === today ? data.dailyStockUsed || 0 : 0;
      return {
        productId: d.id,
        ...data,
        dailyStockUsed,
        dailyStockRemaining:
          dailyStockLimit === null ? null : Math.max(0, dailyStockLimit - dailyStockUsed),
      };
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// POST /api/products — create product
router.post("/", onlyAdmin, async (req, res, next) => {
  try {
    const { name, category, price, imageBase64, mimeType, imageFit, imagePosition, isAvailable, dailyStockLimit } = req.body;

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
      imageUrl = getPublicUrl(fileName);
    }

    const ref = db.collection("products").doc();
    await ref.set({
      name: name.trim(),
      category: category.trim(),
      price,
      imageUrl,
      imageFit: normalizeImageFit(imageFit),
      imagePosition: normalizeImagePosition(imagePosition),
      isAvailable: isAvailable !== false,
      dailyStockLimit: dailyStockLimit || null,
      createdAt: FieldValue.serverTimestamp(),
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
    const { name, category, price, imageBase64, mimeType, imageFit, imagePosition, isAvailable, dailyStockLimit } = req.body;
    const ref = db.collection("products").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Product not found." });

    const updates = {};
    if (name) updates.name = name.trim();
    if (category) updates.category = category.trim();
    if (typeof price === "number" && price > 0) updates.price = price;
    if (typeof isAvailable === "boolean") updates.isAvailable = isAvailable;
    if (dailyStockLimit !== undefined) updates.dailyStockLimit = dailyStockLimit;
    if (imageFit !== undefined) updates.imageFit = normalizeImageFit(imageFit);
    if (imagePosition !== undefined) updates.imagePosition = normalizeImagePosition(imagePosition);
    if (imageBase64 && mimeType) {
      const currentName = name || snap.data().name || "product";
      const fileName = `product_images/${Date.now()}_${currentName.replace(/\s+/g, "_")}`;
      const file = bucket.file(fileName);
      await file.save(Buffer.from(imageBase64, "base64"), { metadata: { contentType: mimeType } });
      await file.makePublic();
      updates.imageUrl = getPublicUrl(fileName);
    }
    updates.updatedAt = FieldValue.serverTimestamp();

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

    await ref.update({ isAvailable: false, deletedAt: FieldValue.serverTimestamp() });
    await writeAuditLog({ actorUid: req.user.uid, action: "product_delete" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
