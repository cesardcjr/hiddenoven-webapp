import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

// Generate all 30-min slots from 10:00 AM to 5:30 PM (last start = 5:30, ends 6:00)
function generateSlotOptions() {
  const opts = [];
  for (let m = 10 * 60; m < 18 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    const label = `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
    const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    opts.push({ label, value });
  }
  return opts;
}

const SLOT_OPTIONS = generateSlotOptions();

function formatTime(startTime) {
  if (!startTime) return "—";
  const [hStr, mStr] = startTime.split(":");
  const h = parseInt(hStr);
  const m = parseInt(mStr);
  const endM = h * 60 + m + 30;
  const eh = Math.floor(endM / 60);
  const em = endM % 60;
  const fmt = (hh, mm) => {
    const ampm = hh >= 12 ? "PM" : "AM";
    return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${ampm}`;
  };
  return `${fmt(h, m)} – ${fmt(eh, em)}`;
}

const EMPTY_FORM = { startTime: "", maxOrders: "" };

function btnStyle(v) {
  const b = {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.18s",
    fontFamily: "Inter,sans-serif",
  };
  if (v === "outline")
    return {
      ...b,
      background: "transparent",
      color: "#F0E8D8",
      border: "1.5px solid rgba(201,168,76,0.3)",
    };
  if (v === "ghost")
    return {
      ...b,
      background: "transparent",
      color: "#9080A8",
      border: "1.5px solid rgba(201,168,76,0.18)",
    };
  if (v === "danger") return { ...b, background: "#E05252", color: "#fff" };
  return b;
}

export default function AdminPickupTimesPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function load() {
    setLoading(true);
    try {
      setConfigs(await api.getPickupConfigs());
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(cfg) {
    setEditing(cfg);
    setForm({ startTime: cfg.startTime, maxOrders: String(cfg.maxOrders) });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.startTime) {
      showToast("Please select a time slot.", "error");
      return;
    }
    const maxOrders = parseInt(form.maxOrders);
    if (!maxOrders || maxOrders < 1) {
      showToast("Max orders must be at least 1.", "error");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.updatePickupConfig(editing.configId, { maxOrders });
        showToast("Time slot updated.", "success");
      } else {
        await api.createPickupConfig({ startTime: form.startTime, maxOrders });
        showToast("Time slot created.", "success");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cfg) {
    try {
      await api.updatePickupConfig(cfg.configId, { isActive: !cfg.isActive });
      showToast(
        `Slot ${cfg.isActive ? "deactivated" : "activated"}.`,
        "success",
      );
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleDelete(cfg) {
    if (!confirm(`Deactivate the "${cfg.label}" slot?`)) return;
    try {
      await api.deletePickupConfig(cfg.configId);
      showToast("Time slot deactivated.", "success");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // Which start times are already taken (excluding the one being edited)
  const takenTimes = new Set(
    configs
      .filter((c) => !editing || c.configId !== editing.configId)
      .map((c) => c.startTime),
  );

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
  };

  return (
    <AdminLayout>
      <ToastContainer />

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Pickup Time Slots
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Define available pickup windows · Shop hours 10:00 AM – 6:00 PM
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Time Slot
        </button>
      </div>

      {/* Availability rule info banner */}
      <div
        className="rounded-xl p-4 mb-5 text-[0.8rem] leading-relaxed"
        style={{
          background: "rgba(201,168,76,0.07)",
          border: "1px solid rgba(201,168,76,0.2)",
        }}
      >
        <p className="font-semibold mb-1" style={{ color: "#E8C96D" }}>
          📋 Ordering cutoff rules
        </p>
        <p style={{ color: "rgba(240,232,220,0.65)" }}>
          <strong style={{ color: "#F0E8D8" }}>Before 12:00 PM</strong> →
          customer may pick up same day from{" "}
          <strong style={{ color: "#F0E8D8" }}>12:00 PM onwards.</strong>
        </p>
        <p style={{ color: "rgba(240,232,220,0.65)" }}>
          <strong style={{ color: "#F0E8D8" }}>12:00 PM or later</strong> →
          earliest pickup is{" "}
          <strong style={{ color: "#F0E8D8" }}>
            10:00 AM the following day.
          </strong>
        </p>
        <p
          className="mt-1"
          style={{ color: "rgba(240,232,220,0.45)", fontSize: "0.73rem" }}
        >
          Slots fully booked for a given date are automatically hidden from
          customers.
        </p>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : configs.length === 0 ? (
        <div className="text-center py-20" style={{ color: "#9080A8" }}>
          <div className="text-4xl mb-3 opacity-40">🕐</div>
          <p className="text-[0.86rem]">No time slots configured yet.</p>
          <p className="text-[0.75rem] mt-1" style={{ color: "#5A4870" }}>
            Add your first time slot to allow customers to book pickups.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
        >
          <table
            className="w-full border-collapse"
            style={{ fontSize: "0.82rem" }}
          >
            <thead>
              <tr>
                {["Time Window", "Max Orders / Day", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 whitespace-nowrap"
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "#9080A8",
                        borderBottom: "2px solid rgba(201,168,76,0.18)",
                        background: "#1E1235",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg) => (
                <tr
                  key={cfg.configId}
                  style={{ borderBottom: "1px solid rgba(201,168,76,0.09)" }}
                  onMouseEnter={(e) =>
                    Array.from(e.currentTarget.cells).forEach(
                      (td) => (td.style.background = "rgba(201,168,76,0.05)"),
                    )
                  }
                  onMouseLeave={(e) =>
                    Array.from(e.currentTarget.cells).forEach(
                      (td) => (td.style.background = "#1E1235"),
                    )
                  }
                >
                  {/* Time window */}
                  <td
                    className="px-4 py-3"
                    style={{ background: "#1E1235", verticalAlign: "middle" }}
                  >
                    <span className="font-bold" style={{ color: "#E8C96D" }}>
                      {cfg.label}
                    </span>
                  </td>

                  {/* Max orders */}
                  <td
                    className="px-4 py-3 font-semibold"
                    style={{
                      background: "#1E1235",
                      color: "#F0E8D8",
                      verticalAlign: "middle",
                    }}
                  >
                    {cfg.maxOrders} orders
                  </td>

                  {/* Status badge */}
                  <td
                    className="px-4 py-3"
                    style={{ background: "#1E1235", verticalAlign: "middle" }}
                  >
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold"
                      style={
                        cfg.isActive
                          ? {
                              background: "rgba(61,189,135,0.15)",
                              color: "#3DBD87",
                              border: "1px solid rgba(61,189,135,0.3)",
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              color: "#9080A8",
                              border: "1px solid rgba(201,168,76,0.09)",
                            }
                      }
                    >
                      {cfg.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td
                    className="px-4 py-3"
                    style={{ background: "#1E1235", verticalAlign: "middle" }}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        style={btnStyle("outline")}
                        onClick={() => openEdit(cfg)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#C9A84C";
                          e.currentTarget.style.color = "#C9A84C";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(201,168,76,0.3)";
                          e.currentTarget.style.color = "#F0E8D8";
                        }}
                      >
                        Edit
                      </button>
                      <button
                        style={btnStyle("ghost")}
                        onClick={() => handleToggle(cfg)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#9080A8";
                          e.currentTarget.style.color = "#F0E8D8";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor =
                            "rgba(201,168,76,0.18)";
                          e.currentTarget.style.color = "#9080A8";
                        }}
                      >
                        {cfg.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Time Slot" : "Add Time Slot"}
      >
        <p className="text-[0.78rem] mb-5" style={{ color: "#9080A8" }}>
          {editing
            ? "Update the maximum orders for this time window."
            : "Select a 30-minute pickup window within shop hours (10:00 AM – 6:00 PM)."}
        </p>

        {/* Time slot selector */}
        <div className="mb-4">
          <label className="label">Time Slot</label>
          {editing ? (
            /* When editing, show the label read-only */
            <div
              className="px-3 py-2.5 rounded-lg text-[0.87rem] font-semibold"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.2)",
                color: "#E8C96D",
              }}
            >
              {editing.label}
            </div>
          ) : (
            <select
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              style={{ ...inputStyle }}
              onFocus={(e) => {
                e.target.style.borderColor = "#C9A84C";
                e.target.style.background = "rgba(201,168,76,0.06)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(201,168,76,0.25)";
                e.target.style.background = "rgba(255,255,255,0.05)";
              }}
            >
              <option value="" style={{ background: "#261748" }}>
                — Select a time slot —
              </option>
              {SLOT_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={takenTimes.has(opt.value)}
                  style={{
                    background: "#261748",
                    color: takenTimes.has(opt.value) ? "#5A4870" : "#F0E8D8",
                  }}
                >
                  {formatTime(opt.value)}
                  {takenTimes.has(opt.value) ? " (already added)" : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Max orders */}
        <div className="mb-5">
          <label className="label">Max Orders per Day</label>
          <input
            type="number"
            min="1"
            max="999"
            value={form.maxOrders}
            onChange={(e) => setForm({ ...form, maxOrders: e.target.value })}
            placeholder="e.g. 10"
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
          <p className="text-[0.72rem] mt-1.5" style={{ color: "#9080A8" }}>
            Once this limit is reached on a given day, the slot is hidden from
            customers.
          </p>
        </div>

        <div
          className="flex gap-3 justify-end pt-3"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <button onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Slot"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
