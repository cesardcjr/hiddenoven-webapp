const PH_OFFSET_MS = 8 * 60 * 60 * 1000;
const SAME_DAY_CUTOFF_MINUTES = 16 * 60;
const MINIMUM_LEAD_MINUTES = 90;
const SHOP_OPEN_MINUTES = 10 * 60;

function formatPHTDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getPickupAvailability(now = new Date()) {
  const pht = new Date(now.getTime() + PH_OFFSET_MS);
  const currentMinutes =
    pht.getUTCHours() * 60 +
    pht.getUTCMinutes() +
    pht.getUTCSeconds() / 60 +
    pht.getUTCMilliseconds() / 60000;
  const afterCutoff = currentMinutes >= SAME_DAY_CUTOFF_MINUTES;
  const earliestDateValue = afterCutoff
    ? new Date(pht.getTime() + 24 * 60 * 60 * 1000)
    : pht;

  return {
    earliestDate: formatPHTDate(earliestDateValue),
    sameDayCutoffReached: afterCutoff,
    minStartMinutes: afterCutoff
      ? SHOP_OPEN_MINUTES
      : currentMinutes + MINIMUM_LEAD_MINUTES,
  };
}

function isPickupSlotAllowed(pickupDate, startMinutes, now = new Date()) {
  const { earliestDate, minStartMinutes } = getPickupAvailability(now);
  if (pickupDate < earliestDate) return false;
  if (pickupDate === earliestDate && startMinutes < minStartMinutes) return false;
  return true;
}

module.exports = {
  getPickupAvailability,
  isPickupSlotAllowed,
};
