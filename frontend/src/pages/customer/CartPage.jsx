import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { TextInput } from "../../components/ui/FormField";
import { Spinner } from "../../components/ui/Spinner";
import { getDailyStockRemaining } from "../../lib/date";

export default function CartPage() {
  const { items, total, updateQty, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  const [clearConfirm, setClearConfirm] = useState(false);

  const [dateRange, setDateRange] = useState({
    earliestDate: "",
    latestDate: "",
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    contactNumber: "",
    pickupDate: "",
    pickupConfigId: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api
      .getAvailableDates()
      .then(({ earliestDate, latestDate }) => {
        setDateRange({ earliestDate, latestDate });
        setForm((f) => ({ ...f, pickupDate: earliestDate }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.pickupDate) return;
    setSlotsLoading(true);
    setForm((f) => ({ ...f, pickupConfigId: "" }));
    api
      .getAvailableSlots(form.pickupDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.pickupDate]);

  function validate() {
    const e = {};
    if (!form.customerName.trim()) e.customerName = "Name is required.";
    if (!/^(09|\+639)\d{9}$/.test(form.contactNumber))
      e.contactNumber = "Enter a valid PH mobile (09XXXXXXXXX).";
    if (!form.pickupDate) e.pickupDate = "Please select a pickup date.";
    if (!form.pickupConfigId) e.pickupConfigId = "Please select a pickup time.";
    for (const item of items) {
      const remaining = getDailyStockRemaining(item);
      if (remaining !== null && item.qty > remaining) {
        e.form = `${item.name} only has ${remaining} left in stock today.`;
        break;
      }
    }
    return e;
  }

  function handleCheckout() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    if (items.length === 0) {
      setErrors({ form: "Your cart is empty." });
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      contactNumber: form.contactNumber,
      pickupDate: form.pickupDate,
      pickupConfigId: form.pickupConfigId,
      pickupLabel:
        slots.find((slot) => slot.configId === form.pickupConfigId)?.label ||
        "",
      total,
      items: items.map((i) => ({ productId: i.productId, qty: i.qty })),
      displayItems: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
    };
    sessionStorage.setItem("checkout_draft", JSON.stringify(payload));
    navigate("/payment", { state: { checkoutDraft: payload } });
  }

  function handleQtyChange(item, nextQty) {
    const remaining = getDailyStockRemaining(item);
    if (remaining !== null && nextQty > remaining) {
      setErrors({
        form: `${item.name} only has ${remaining} left in stock today.`,
      });
      return;
    }
    setErrors((prev) => ({ ...prev, form: "" }));
    updateQty(item.productId, nextQty);
  }

  function formatDateLabel(d) {
    if (!d) return "";
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day).toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const surfaceStyle = {
    background: "#1E1235",
    border: "1px solid rgba(201,168,76,0.18)",
    borderRadius: "12px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
  };

  const inputStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(201,168,76,0.25)",
    borderRadius: "8px",
    color: "#F0E8D8",
    fontSize: "0.87rem",
    fontFamily: "Inter,sans-serif",
    outline: "none",
    padding: "11px 13px",
    transition: "border 0.2s, background 0.2s",
    WebkitAppearance: "none",
    appearance: "none",
    colorScheme: "dark",
  };

  const pickupSelectStyle = {
    ...inputStyle,
    background: "#261748",
    color: "#E8C96D",
    border: "1.5px solid rgba(201,168,76,0.35)",
  };

  const labelStyle = {
    display: "block",
    fontSize: "0.69rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: "#9080A8",
    marginBottom: "6px",
  };

  const errorStyle = {
    fontSize: "0.72rem",
    color: "#E05252",
    marginTop: "4px",
  };

  return (
    <CustomerLayout>
      {/* ── Page heading with Clear Cart ── */}
      <div className="flex items-center justify-between mb-6">
        <h1
          className="font-display text-2xl font-bold"
          style={{ color: "#E8C96D" }}
        >
          Your Cart
        </h1>

        {items.length > 0 &&
          (clearConfirm ? (
            <div className="flex items-center gap-2">
              <span
                className="text-[0.75rem]"
                style={{ color: "rgba(240,232,220,0.45)" }}
              >
                Clear all items?
              </span>
              <button
                onClick={() => {
                  clearCart();
                  setClearConfirm(false);
                }}
                className="text-[0.75rem] font-semibold"
                style={{ color: "#E05252" }}
              >
                Yes, clear
              </button>
              <button
                onClick={() => setClearConfirm(false)}
                className="text-[0.75rem] font-medium"
                style={{ color: "rgba(240,232,220,0.4)" }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setClearConfirm(true)}
              className="text-[0.75rem] font-medium transition-colors duration-150"
              style={{ color: "rgba(240,232,220,0.35)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#E05252")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(240,232,220,0.35)")
              }
            >
              Clear cart
            </button>
          ))}
      </div>

      {items.length === 0 ? (
        <div
          className="text-center py-20"
          style={{ color: "rgba(240,232,220,0.45)" }}
        >
          <div className="text-5xl mb-4 opacity-40">🛒</div>
          <p className="mb-5 text-sm">Your cart is empty.</p>
          <button onClick={() => navigate("/catalog")} className="btn-primary">
            Browse Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Cart items ── */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => {
              const remaining = getDailyStockRemaining(item);
              const atLimit = remaining !== null && item.qty >= remaining;
              return (
              <div
                key={item.productId}
                className="flex flex-wrap items-center gap-3 px-4 py-4 rounded-card sm:flex-nowrap sm:gap-4 sm:px-5"
                style={surfaceStyle}
              >
                <div className="w-full min-w-0 sm:flex-1">
                  <p
                    className="font-semibold text-[0.9rem] leading-snug break-words"
                    style={{ color: "#F0E8D8" }}
                  >
                    {item.name}
                  </p>
                  <p
                    className="text-[0.75rem] mt-0.5"
                    style={{ color: "rgba(240,232,220,0.45)" }}
                  >
                    ₱{item.price.toFixed(2)} each
                  </p>
                </div>

                {/* Qty stepper */}
                <div className="flex items-center gap-1 order-3 sm:order-none">
                  <button
                    onClick={() => handleQtyChange(item, item.qty - 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold sm:w-7 sm:h-7"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      color: "#C9A84C",
                      border: "1px solid rgba(201,168,76,0.2)",
                    }}
                  >
                    −
                  </button>
                  <span
                    className="w-9 text-center text-[0.85rem] font-semibold sm:w-8"
                    style={{ color: "#F0E8D8" }}
                  >
                    {item.qty}
                  </span>
                  <button
                    onClick={() => handleQtyChange(item, item.qty + 1)}
                    disabled={atLimit}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold sm:w-7 sm:h-7"
                    style={{
                      background: "rgba(201,168,76,0.12)",
                      color: atLimit ? "#5A4870" : "#C9A84C",
                      border: "1px solid rgba(201,168,76,0.2)",
                      cursor: atLimit ? "not-allowed" : "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <p
                  className="font-bold ml-auto min-w-[76px] text-right text-[0.9rem]"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{(item.price * item.qty).toFixed(2)}
                </p>

                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-[0.75rem] font-medium ml-auto sm:ml-0"
                  style={{ color: "rgba(224,82,82,0.7)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#E05252")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(224,82,82,0.7)")
                  }
                >
                  Remove
                </button>
              </div>
            );})}
            <div
              className="flex justify-between items-center px-5 py-4 rounded-card"
              style={surfaceStyle}
            >
              <span
                className="font-semibold text-sm"
                style={{ color: "#F0E8D8" }}
              >
                Total Amount
              </span>
              <span
                className="font-bold text-lg"
                style={{ color: "#C9A84C" }}
              >
                ₱{total.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => navigate("/catalog")}
              className="btn-secondary"
            >
              Back to Catalog
            </button>
          </div>

          {/* ── Order details / checkout ── */}
          <div className="h-fit" style={surfaceStyle}>
            <div className="p-5">
              <h2
                className="font-display font-bold text-[1rem] mb-4"
                style={{ color: "#E8C96D" }}
              >
                Order Details
              </h2>

              <TextInput
                label="Your Name"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                error={errors.customerName}
                placeholder="Juan Dela Cruz"
              />

              <TextInput
                label="Mobile Number"
                value={form.contactNumber}
                onChange={(e) =>
                  setForm({ ...form, contactNumber: e.target.value })
                }
                error={errors.contactNumber}
                placeholder="09XXXXXXXXX"
              />

              {/* ── Pickup Date ── */}
              <div className="mb-4">
                <label style={labelStyle}>Pickup Date</label>
                <input
                  type="date"
                  value={form.pickupDate}
                  min={dateRange.earliestDate}
                  max={dateRange.latestDate}
                  onChange={(e) =>
                    setForm({ ...form, pickupDate: e.target.value })
                  }
                  style={inputStyle}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#C9A84C";
                    e.target.style.background = "rgba(201,168,76,0.06)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(201,168,76,0.25)";
                    e.target.style.background = "rgba(255,255,255,0.05)";
                  }}
                />
                {errors.pickupDate && (
                  <p style={errorStyle}>{errors.pickupDate}</p>
                )}
              </div>

              {/* ── Pickup Time ── */}
              <div className="mb-4">
                <label style={labelStyle}>Pickup Time</label>

                {!form.pickupDate ? (
                  <div
                    className="px-3 py-2.5 rounded-lg text-[0.82rem]"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1.5px solid rgba(201,168,76,0.12)",
                      color: "#5A4870",
                    }}
                  >
                    Select a date first
                  </div>
                ) : slotsLoading ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1.5px solid rgba(201,168,76,0.12)",
                    }}
                  >
                    <Spinner className="!w-4 !h-4" />
                    <span
                      className="text-[0.8rem]"
                      style={{ color: "#9080A8" }}
                    >
                      Loading slots…
                    </span>
                  </div>
                ) : slots.length === 0 ? (
                  <div
                    className="px-3 py-2.5 rounded-lg text-[0.82rem]"
                    style={{
                      background: "rgba(224,82,82,0.08)",
                      border: "1.5px solid rgba(224,82,82,0.2)",
                      color: "#E05252",
                    }}
                  >
                    No slots available on this date. Please choose another day.
                  </div>
                ) : (
                  <select
                    value={form.pickupConfigId}
                    onChange={(e) =>
                      setForm({ ...form, pickupConfigId: e.target.value })
                    }
                    style={pickupSelectStyle}
                  >
                    <option value="">Select pickup time</option>
                    {slots
                      .filter((slot) => slot.remaining > 0)
                      .map((slot) => (
                        <option key={slot.configId} value={slot.configId}>
                          {slot.label}
                        </option>
                      ))}
                  </select>
                )}
                {errors.pickupConfigId && (
                  <p style={errorStyle}>{errors.pickupConfigId}</p>
                )}
              </div>

              {/* Selected pickup summary */}
              {form.pickupDate &&
                form.pickupConfigId &&
                (() => {
                  const chosen = slots.find(
                    (s) => s.configId === form.pickupConfigId,
                  );
                  return chosen ? (
                    <div
                      className="rounded-lg px-3.5 py-2.5 mb-4 text-[0.78rem]"
                      style={{
                        background: "rgba(201,168,76,0.08)",
                        border: "1px solid rgba(201,168,76,0.2)",
                      }}
                    >
                      <span style={{ color: "rgba(240,232,220,0.55)" }}>
                        Pickup:{" "}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "#E8C96D" }}
                      >
                        {formatDateLabel(form.pickupDate)}, {chosen.label}
                      </span>
                    </div>
                  ) : null;
                })()}

              {/* Total */}
              <div
                className="flex justify-between items-center py-4 mt-2"
                style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
              >
                <span
                  className="font-semibold text-sm"
                  style={{ color: "#F0E8D8" }}
                >
                  Total
                </span>
                <span
                  className="font-bold text-lg"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{total.toFixed(2)}
                </span>
              </div>

              {errors.form && <p style={errorStyle}>{errors.form}</p>}

              <button
                onClick={handleCheckout}
                className="btn-primary w-full"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
