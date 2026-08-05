export function getPHTDateString(date = new Date()) {
  const pht = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  return `${pht.getUTCFullYear()}-${String(pht.getUTCMonth() + 1).padStart(2, "0")}-${String(pht.getUTCDate()).padStart(2, "0")}`;
}

export function getDailyStockRemaining(product) {
  const limit = product?.dailyStockLimit || null;
  if (!limit) return null;
  const used =
    product.stockDate === getPHTDateString() ? product.dailyStockUsed || 0 : 0;
  return Math.max(0, limit - used);
}
