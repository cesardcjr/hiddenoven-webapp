const { errorHandler } = require("./errorHandler");

function response() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test("does not expose internal server errors", () => {
  const res = response();
  jest.spyOn(console, "error").mockImplementation(() => {});
  errorHandler(new Error("database credential path"), {}, res, () => {});
  expect(res.statusCode).toBe(500);
  expect(res.payload.error).toBe("An unexpected error occurred.");
  console.error.mockRestore();
});

test("preserves safe client error messages", () => {
  const res = response();
  jest.spyOn(console, "error").mockImplementation(() => {});
  errorHandler(Object.assign(new Error("Invalid order."), { status: 400 }), {}, res, () => {});
  expect(res.statusCode).toBe(400);
  expect(res.payload.error).toBe("Invalid order.");
  console.error.mockRestore();
});
