import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput, SelectInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

const CATEGORY_OPTIONS = [
  { value: "bread",  label: "Bread" },
  { value: "pastry", label: "Pastry" },
  { value: "cake",   label: "Cake" },
];

const EMPTY_FORM = { name: "", category: "", price: "", isAvailable: true, dailyStockLimit: "", imageBase64: null, mimeType: null };

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState(null); // null = create
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProducts(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      isAvailable: product.isAvailable,
      dailyStockLimit: product.dailyStockLimit ?? "",
      imageBase64: null,
      mimeType: null,
    });
    setModalOpen(true);
  }

  function handleImage(e) {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({
      ...prev,
      imageBase64: reader.result.split(",")[1],
      mimeType: f.type,
    }));
    reader.readAsDataURL(f);
  }

  async function handleSave() {
    if (!form.name || !form.category || !form.price) {
      showToast("Name, category, and price are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        isAvailable: form.isAvailable,
        dailyStockLimit: form.dailyStockLimit ? parseInt(form.dailyStockLimit) : null,
        ...(form.imageBase64 && { imageBase64: form.imageBase64, mimeType: form.mimeType }),
      };
      if (editing) {
        await api.updateProduct(editing.productId, payload);
        showToast("Product updated.", "success");
      } else {
        await api.createProduct(payload);
        showToast("Product created.", "success");
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Mark "${product.name}" as unavailable?`)) return;
    try {
      await api.deleteProduct(product.productId);
      showToast("Product deactivated.", "success");
      loadProducts();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold">Products</h1>
        <button onClick={openCreate} className="btn-primary">+ Add Product</button>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {["Name", "Category", "Price", "Available", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-neutral-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products.map((p) => (
                <tr key={p.productId} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-neutral-500 capitalize">{p.category}</td>
                  <td className="px-4 py-3 text-brand-600 font-semibold">₱{p.price?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.isAvailable ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                      {p.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 flex gap-3">
                    <button onClick={() => openEdit(p)} className="text-brand-500 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => handleDelete(p)} className="text-red-400 hover:underline text-xs font-medium">Deactivate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center py-10 text-neutral-400">No products yet.</p>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"}>
        <TextInput label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pandesal" />
        <SelectInput label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORY_OPTIONS} />
        <TextInput label="Price (₱)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
        <TextInput label="Daily Stock Limit (optional)" type="number" min="0" value={form.dailyStockLimit} onChange={(e) => setForm({ ...form, dailyStockLimit: e.target.value })} placeholder="Leave blank for unlimited" />

        <div className="mb-4">
          <label className="label">Product Image</label>
          <input type="file" accept="image/*" onChange={handleImage} className="text-sm text-neutral-600" />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input type="checkbox" id="available" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} />
          <label htmlFor="available" className="text-sm text-neutral-700">Available for ordering</label>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
