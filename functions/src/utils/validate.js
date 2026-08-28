/**
 * Validates a Philippine mobile number (09XXXXXXXXX or +639XXXXXXXXX).
 */
function isValidPHMobile(number) {
  return /^(09|\+639)\d{9}$/.test(number);
}

/**
 * Validates order items array — must be non-empty with valid qty.
 */
function validateOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "Order must contain at least one item.";
  }
  for (const item of items) {
    if (!item.productId || typeof item.productId !== "string") {
      return "Each item must have a valid productId.";
    }
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      return "Each item must have a qty of at least 1.";
    }
  }
  return null;
}

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function decodeImageBase64(imageBase64, mimeType, maxBytes = 5 * 1024 * 1024) {
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    return { error: "Image must be a JPG, PNG, or WebP file." };
  }
  if (typeof imageBase64 !== "string" || !imageBase64.length) {
    return { error: "Image data is required." };
  }
  if (imageBase64.length > Math.ceil(maxBytes * 4 / 3) + 4) {
    return { error: "Image must be under 5MB." };
  }
  if (imageBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return { error: "Image data is invalid." };
  }

  const buffer = Buffer.from(imageBase64, "base64");
  if (!buffer.length || buffer.length > maxBytes) {
    return { error: "Image must be under 5MB." };
  }

  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isWebp = buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  const signatureMatches =
    (mimeType === "image/jpeg" && isJpeg)
    || (mimeType === "image/png" && isPng)
    || (mimeType === "image/webp" && isWebp);

  return signatureMatches
    ? { buffer }
    : { error: "Image contents do not match the selected file type." };
}

/**
 * Allowed order status transitions.
 */
const VALID_TRANSITIONS = {
  NEW: ["PAYMENT_REVIEW", "CANCELLED"],
  PAYMENT_REVIEW: ["PREPARING", "PAYMENT_REJECTED", "CANCELLED"],
  PAYMENT_REJECTED: ["PAYMENT_REVIEW", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

function isValidTransition(from, to, order = {}) {
  if (from === "NEW" && to === "PREPARING") {
    return order.orderType === "WALK_IN";
  }
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

module.exports = {
  isValidPHMobile,
  validateOrderItems,
  isValidTransition,
  decodeImageBase64,
};
