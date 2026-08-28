function errorHandler(err, req, res, next) {
  console.error("[ErrorHandler]", err);
  const status = err.status || 500;
  const message = status >= 500
    ? "An unexpected error occurred."
    : err.message || "Request failed.";
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
