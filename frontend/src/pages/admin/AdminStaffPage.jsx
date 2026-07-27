import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

export default function AdminStaffPage() {
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function loadStaff() {
    setLoading(true);
    try {
      const data = await api.getStaff();
      setStaff(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStaff(); }, []);

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
    const action = member.isActive ? "deactivate" : "reactivate";
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${member.name}?`)) return;
    try {
      if (member.isActive) {
        await api.deactivateStaff(member.uid);
      } else {
        await api.updateStaff(member.uid, { isActive: true });
      }
      showToast(`Staff member ${action}d.`, "success");
      loadStaff();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Staff</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary">+ Add Staff</button>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {["Name", "Email", "Phone", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-neutral-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {staff.map((s) => (
                <tr key={s.uid} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-neutral-500">{s.email}</td>
                  <td className="px-4 py-3 text-neutral-500">{s.phone || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${s.isActive ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-400"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(s)} className={`text-xs font-medium hover:underline ${s.isActive ? "text-red-400" : "text-brand-500"}`}>
                      {s.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && <p className="text-center py-10 text-neutral-400">No staff accounts yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
        <TextInput label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Maria Santos" />
        <TextInput label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="maria@hiddenoven.com" />
        <TextInput label="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09XXXXXXXXX" />
        <TextInput label="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 6 characters" />
        <div className="flex gap-3 justify-end mt-2">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="btn-primary">{saving ? "Creating…" : "Create Account"}</button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
