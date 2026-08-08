import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput, PasswordInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

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
    fontFamily: "Google Sans,Arial,sans-serif",
  };
  if (v === "outline")
    return {
      ...b,
      background: "transparent",
      color: "#17151D",
      border: "1.5px solid rgba(70,44,125,0.3)",
    };
  if (v === "ghost")
    return {
      ...b,
      background: "transparent",
      color: "#6F6B78",
      border: "1.5px solid rgba(70,44,125,0.18)",
    };
  if (v === "danger") return { ...b, background: "#E05252", color: "#fff" };
  return b;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function loadStaff() {
    setLoading(true);
    try {
      setStaff(await api.getStaff());
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadStaff();
  }, []);

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      showToast("Name, email, and password are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.createStaff(form);
      showToast("Staff account created.", "success");
      setModalOpen(false);
      setForm(EMPTY_FORM);
      loadStaff();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(member) {
    if (
      !confirm(`${member.isActive ? "Delete" : "Reactivate"} ${member.name}?`)
    )
      return;
    try {
      member.isActive
        ? await api.deactivateStaff(member.uid)
        : await api.updateStaff(member.uid, { isActive: true });
      showToast(
        `Staff member ${member.isActive ? "deleted" : "reactivated"}.`,
        "success",
      );
      loadStaff();
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
            style={{ color: "#462C7D" }}
          >
            Staff Accounts
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#6F6B78" }}>
            Manage access and roles
          </p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY_FORM);
            setModalOpen(true);
          }}
          className="btn-primary"
        >
          + Add Staff
        </button>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {staff.map((s) => (
            <div
              key={s.uid}
              className="flex flex-col overflow-hidden rounded-xl"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(70,44,125,0.18)",
                boxShadow: "0 2px 12px rgba(23,21,29,0.08)",
              }}
            >
              {/* Avatar area */}
              <div
                className="flex flex-col items-center gap-2 py-5"
                style={{
                  background: "#F4F1F8",
                  borderBottom: "1px solid rgba(70,44,125,0.09)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
                  style={{ background: "#462C7D", color: "#FFFFFF" }}
                >
                  {s.name?.charAt(0)?.toUpperCase()}
                </div>
                <span
                  className="text-[0.68rem] font-bold px-2.5 py-0.5 rounded-full"
                  style={
                    s.isActive
                      ? {
                          background: "rgba(61,189,135,0.15)",
                          color: "#3DBD87",
                          border: "1px solid rgba(61,189,135,0.3)",
                        }
                      : {
                          background: "#FFFFFF",
                          color: "#6F6B78",
                          border: "1px solid rgba(70,44,125,0.09)",
                        }
                  }
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 p-4">
                <div
                  className="font-bold text-[0.9rem] mb-1"
                  style={{ color: "#17151D" }}
                >
                  {s.name}
                </div>
                <div
                  className="text-[0.74rem] mb-2 truncate"
                  style={{ color: "#6F6B78" }}
                >
                  {s.email}
                </div>
                <span
                  className="inline-flex self-start text-[0.68rem] font-bold px-2.5 py-0.5 rounded-full mb-1"
                  style={
                    s.role === "admin"
                      ? {
                          background: "rgba(107,159,232,0.15)",
                          color: "#6B9FE8",
                          border: "1px solid rgba(107,159,232,0.3)",
                        }
                      : {
                          background: "rgba(232,169,76,0.12)",
                          color: "#E8A94C",
                          border: "1px solid rgba(232,169,76,0.3)",
                        }
                  }
                >
                  {s.role === "admin" ? "Admin" : "Staff"}
                </span>
                {s.phone && (
                  <div
                    className="text-[0.72rem] mt-1"
                    style={{ color: "#6F6B78" }}
                  >
                    {s.phone}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div
                className="grid grid-cols-2 gap-2 px-4 pb-4"
                style={{
                  borderTop: "1px solid rgba(70,44,125,0.09)",
                  paddingTop: "12px",
                }}
              >
                <button
                  style={btnStyle("outline")}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#462C7D";
                    e.currentTarget.style.color = "#462C7D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(70,44,125,0.3)";
                    e.currentTarget.style.color = "#17151D";
                  }}
                >
                  Edit
                </button>
                <button
                  style={btnStyle(s.isActive ? "danger" : "ghost")}
                  onClick={() => handleToggle(s)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#6F6B78";
                    e.currentTarget.style.color = "#17151D";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(70,44,125,0.18)";
                    e.currentTarget.style.color = "#6F6B78";
                  }}
                >
                  {s.isActive ? "Delete" : "Activate"}
                </button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div
              className="col-span-full text-center py-20"
              style={{ color: "#6F6B78" }}
            >
              <div className="text-4xl mb-3 opacity-40">👥</div>
              <p className="text-[0.86rem]">No staff accounts yet.</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Staff Member"
      >
        <p className="text-[0.78rem] mb-4" style={{ color: "#6F6B78" }}>
          New staff will receive login credentials via email.
        </p>
        <TextInput
          label="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Maria Santos"
        />
        <TextInput
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="staff@hiddenoven.com"
        />
        <TextInput
          label="Phone (optional)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="09XXXXXXXXX"
        />
        <PasswordInput
          label="Temporary Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Min. 6 characters"
        />
        <div
          className="flex gap-3 justify-end pt-2 mt-2"
          style={{ borderTop: "1px solid rgba(70,44,125,0.12)" }}
        >
          <button onClick={() => setModalOpen(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? "Creating…" : "Create Account"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
