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

function isValidTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

module.exports = { isValidPHMobile, validateOrderItems, isValidTransition };
