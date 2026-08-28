const { createRateLimit } = require("./rateLimit");

function response() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test("limits repeated requests by client address", () => {
  const limiter = createRateLimit({ windowMs: 60000, max: 2, keyPrefix: `test-${Date.now()}` });
  const req = { headers: { "x-forwarded-for": "203.0.113.10" }, ip: "127.0.0.1" };

  for (let requestNumber = 1; requestNumber <= 2; requestNumber += 1) {
    const res = response();
    const next = jest.fn();
    limiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  }

  const blocked = response();
  const next = jest.fn();
  limiter(req, blocked, next);
  expect(next).not.toHaveBeenCalled();
  expect(blocked.statusCode).toBe(429);
  expect(blocked.headers["Retry-After"]).toBeDefined();
});
