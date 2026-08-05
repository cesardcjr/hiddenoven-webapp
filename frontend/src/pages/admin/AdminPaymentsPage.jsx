import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

const EMPTY_FORM = {
  provider: "",
  accountName: "",
  accountNumber: "",
  isActive: true,
  imageBase64: null,
  mimeType: null,
  preview: "",
};

function btnStyle(variant) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 12px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.18s",
    fontFamily: "Inter,sans-serif",
  };

  if (variant === "danger") return { ...base, background: "#E05252", color: "#fff" };
  if (variant === "ghost")
    return {
      ...base,
      background: "transparent",
      color: "#9080A8",
      border: "1.5px solid rgba(201,168,76,0.18)",
    };
  return {
    ...base,
    background: "transparent",
    color: "#F0E8D8",
    border: "1.5px solid rgba(201,168,76,0.3)",
  };
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please upload an image file."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("QR image must be under 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        imageBase64: reader.result.split(",")[1],
        mimeType: file.type,
        preview: URL.createObjectURL(file),
      });
    reader.onerror = () => reject(new Error("Could not read QR image."));
    reader.readAsDataURL(file);
  });
}

export default function AdminPaymentsPage() {
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function loadModes() {
    setLoading(true);
    try {
      setModes(await api.getAdminPaymentModes());
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModes();
  }, []);

  useEffect(() => {
    return () => {
      if (form.preview?.startsWith("blob:")) URL.revokeObjectURL(form.preview);
    };
  }, [form.preview]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(mode) {
    setEditing(mode);
    setForm({
      provider: mode.provider || "",
      accountName: mode.accountName || "",
      accountNumber: mode.accountNumber || "",
      isActive: mode.isActive !== false,
      imageBase64: null,
      mimeType: null,
      preview: mode.qrImageUrl || "",
    });
    setModalOpen(true);
  }

  async function handleQrChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const image = await readImage(file);
      setForm((prev) => {
        if (prev.preview?.startsWith("blob:")) URL.revokeObjectURL(prev.preview);
        return { ...prev, ...image };
      });
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleSave() {
    if (!form.provider.trim() || !form.accountNumber.trim()) {
      showToast("Provider and account number are required.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        provider: form.provider.trim(),
        accountName: form.accountName.trim(),
        accountNumber: form.accountNumber.trim(),
        isActive: form.isActive,
        ...(form.imageBase64 && {
          imageBase64: form.imageBase64,
          mimeType: form.mimeType,
        }),
      };

      editing
        ? await api.updatePaymentMode(editing.modeId, payload)
        : await api.createPaymentMode(payload);

      showToast(
        editing ? "Payment mode updated." : "Payment mode added.",
        "success",
      );
      setModalOpen(false);
      setForm(EMPTY_FORM);
      loadModes();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(mode) {
    try {
      await api.updatePaymentMode(mode.modeId, { isActive: !mode.isActive });
      showToast(
        `Payment mode ${mode.isActive ? "deactivated" : "activated"}.`,
        "success",
      );
      loadModes();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function handleDelete(mode) {
    if (!confirm(`Delete ${mode.provider} payment mode?`)) return;
    try {
      await api.deletePaymentMode(mode.modeId);
      showToast("Payment mode deleted.", "success");
      loadModes();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2
            className="font-display font-bold text-[1.2rem]"
            style={{ color: "#E8C96D" }}
          >
            Payment Modes
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Manage the payment options shown to customers
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Payment Mode
        </button>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {modes.map((mode) => (
            <div
              key={mode.modeId}
              className="flex flex-col overflow-hidden rounded-xl"
              style={{
                background: "#1E1235",
                border: "1px solid rgba(201,168,76,0.18)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
            >
              <div
                className="aspect-square flex items-center justify-center relative"
                style={{ background: "#261748" }}
              >
                {mode.qrImageUrl ? (
                  <img
                    src={mode.qrImageUrl}
                    alt={`${mode.provider} QR code`}
                    className="w-full h-full object-contain p-3"
                  />
                ) : (
                  <span className="text-[0.75rem]" style={{ color: "#9080A8" }}>
                    No QR
                  </span>
                )}
                <span
                  className="absolute top-2 right-2 text-[0.64rem] font-bold px-2 py-0.5 rounded-full"
                  style={
                    mode.isActive
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
                  {mode.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex flex-col flex-1 p-3 md:p-4">
                <div
                  className="font-bold text-[0.84rem] md:text-[0.9rem] mb-1 truncate"
                  style={{ color: "#F0E8D8" }}
                >
                  {mode.provider}
                </div>
                {mode.accountName && (
                  <div
                    className="text-[0.7rem] truncate"
                    style={{ color: "#9080A8" }}
                  >
                    {mode.accountName}
                  </div>
                )}
                <div
                  className="text-[0.72rem] break-all mt-1"
                  style={{ color: "#C9A84C" }}
                >
                  {mode.accountNumber}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-3 md:px-4 pb-3 md:pb-4">
                <button style={btnStyle("outline")} onClick={() => openEdit(mode)}>
                  Edit
                </button>
                <button style={btnStyle("ghost")} onClick={() => handleToggle(mode)}>
                  {mode.isActive ? "Deactivate" : "Activate"}
                </button>
                <button style={btnStyle("danger")} onClick={() => handleDelete(mode)}>
                  Delete
                </button>
              </div>
            </div>
          ))}

          {modes.length === 0 && (
            <div
              className="col-span-full text-center py-20"
              style={{ color: "#9080A8" }}
            >
              <p className="text-[0.86rem]">No payment modes yet.</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Payment Mode" : "Add Payment Mode"}
      >
        <TextInput
          label="Bank or Service Provider"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          placeholder="GCash, Maya, BPI"
        />
        <TextInput
          label="Account Name"
          value={form.accountName}
          onChange={(e) => setForm({ ...form, accountName: e.target.value })}
          placeholder="The Hidden Oven"
        />
        <TextInput
          label="Account Number"
          value={form.accountNumber}
          onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
          placeholder="09XXXXXXXXX or bank account number"
        />

        <div className="mb-4">
          <label className="label">QR Code</label>
          <div
            className="rounded-lg p-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1.5px solid rgba(201,168,76,0.18)",
            }}
          >
            {form.preview && (
              <img
                src={form.preview}
                alt="QR preview"
                className="w-32 h-32 object-contain rounded-lg mb-3"
                style={{ background: "#261748" }}
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleQrChange}
              className="text-[0.82rem] w-full"
              style={{ color: "#9080A8" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <label className="relative w-9 h-5 flex-shrink-0 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            <div
              className="w-9 h-5 rounded-full transition-colors duration-200"
              style={{ background: form.isActive ? "#3DBD87" : "#5A4870" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                style={{
                  transform: form.isActive
                    ? "translateX(18px)"
                    : "translateX(2px)",
                }}
              />
            </div>
          </label>
          <span
            className="text-[0.83rem] font-semibold"
            style={{ color: "#F0E8D8" }}
          >
            Active and visible to customers
          </span>
        </div>

        <div
          className="flex gap-3 justify-end pt-2"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <button onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Saving..." : "Save Payment Mode"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
