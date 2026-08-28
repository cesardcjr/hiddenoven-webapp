const {
  isValidPHMobile,
  validateOrderItems,
  isValidTransition,
  decodeImageBase64,
} = require("./validate");

describe("order validation", () => {
  test("accepts supported Philippine mobile formats", () => {
    expect(isValidPHMobile("09171234567")).toBe(true);
    expect(isValidPHMobile("+639171234567")).toBe(true);
    expect(isValidPHMobile("9171234567")).toBe(false);
  });

  test("rejects invalid order item quantities", () => {
    expect(validateOrderItems([])).toMatch(/at least one item/i);
    expect(validateOrderItems([{ productId: "p1", qty: 0 }])).toMatch(/qty/i);
    expect(validateOrderItems([{ productId: "p1", qty: 2 }])).toBeNull();
  });

  test("enforces order status transitions", () => {
    expect(isValidTransition("NEW", "PAYMENT_REVIEW")).toBe(true);
    expect(isValidTransition("NEW", "PREPARING", { orderType: "ONLINE" })).toBe(false);
    expect(isValidTransition("NEW", "PREPARING", { orderType: "WALK_IN" })).toBe(true);
    expect(isValidTransition("COMPLETED", "PREPARING")).toBe(false);
  });
});

describe("image validation", () => {
  const onePixelPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  test("accepts a valid supported image", () => {
    const result = decodeImageBase64(onePixelPng, "image/png");
    expect(result.error).toBeUndefined();
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
  });

  test("rejects mismatched and unsafe image types", () => {
    expect(decodeImageBase64(onePixelPng, "image/jpeg").error).toMatch(/do not match/i);
    expect(decodeImageBase64(onePixelPng, "image/svg+xml").error).toMatch(/JPG, PNG, or WebP/i);
  });
});
