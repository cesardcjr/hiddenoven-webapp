import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { TextInput, SelectInput } from "../../components/ui/FormField";
import { useToast } from "../../components/ui/Toast";

const CATEGORY_OPTIONS = [
  { value: "bread", label: "Bread" },
  { value: "pastry", label: "Pastry" },
  { value: "cake", label: "Cake" },
];
const EMPTY_FORM = {
  name: "",
  category: "",
  price: "",
  isAvailable: true,
  dailyStockLimit: "",
  imageBase64: null,
  mimeType: null,
};

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
  if (v === "danger") return { ...b, background: "#E05252", color: "#fff" };
  return b;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { showToast, ToastContainer } = useToast();

  async function loadProducts() {
    setLoading(true);
    try {
      setProducts(await api.getProducts());
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadProducts();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }
  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      isAvailable: p.isAvailable,
      dailyStockLimit: p.dailyStockLimit ?? "",
      imageBase64: null,
      mimeType: null,
    });
    setModalOpen(true);
  }
  function handleImage(e) {
    const f = e.target.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () =>
      setForm((prev) => ({
        ...prev,
        imageBase64: r.result.split(",")[1],
        mimeType: f.type,
      }));
    r.readAsDataURL(f);
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
        dailyStockLimit: form.dailyStockLimit
          ? parseInt(form.dailyStockLimit)
          : null,
        ...(form.imageBase64 && {
          imageBase64: form.imageBase64,
          mimeType: form.mimeType,
        }),
      };
      editing
        ? await api.updateProduct(editing.productId, payload)
        : await api.createProduct(payload);
      showToast(editing ? "Product updated." : "Product created.", "success");
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  }
  async function handleDelete(p) {
    if (!confirm(`Mark "${p.name}" as unavailable?`)) return;
    try {
      await api.deleteProduct(p.productId);
      showToast("Product deactivated.", "success");
      loadProducts();
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
            Products
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#9080A8" }}>
            Manage your bakery catalog
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Add Product
        </button>
      </div>

      {loading ? (
        <Spinner className="py-20" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <div
              key={p.productId}
              className="flex flex-col overflow-hidden rounded-xl transition-all duration-200"
              style={{
                background: "#1E1235",
                border: "1px solid rgba(201,168,76,0.18)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.45)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.35)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Image */}
              <div
                className="h-36 flex items-center justify-center relative overflow-hidden"
                style={{ background: "#261748" }}
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl opacity-60">🍞</span>
                )}
                <span
                  className="absolute top-2 right-2 text-[0.68rem] font-bold px-2.5 py-0.5 rounded-full"
                  style={
                    p.isAvailable
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
                  {p.isAvailable ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 p-4">
                <div
                  className="font-bold text-[0.9rem] mb-1"
                  style={{ color: "#F0E8D8" }}
                >
                  {p.name}
                </div>
                <div
                  className="text-[0.74rem] capitalize mb-1"
                  style={{ color: "#9080A8" }}
                >
                  {p.category}
                </div>
                {p.dailyStockLimit && (
                  <div
                    className="text-[0.72rem] mb-2"
                    style={{ color: "#9080A8" }}
                  >
                    Max/day: {p.dailyStockLimit}
                  </div>
                )}
                <div
                  className="font-bold text-[1rem] mt-auto mb-3"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{p.price?.toFixed(2)}
                </div>
              </div>

              {/* Footer actions */}
              <div
                className="grid grid-cols-2 gap-2 px-4 pb-4"
                style={{
                  borderTop: "1px solid rgba(201,168,76,0.09)",
                  paddingTop: "12px",
                }}
              >
                <button
                  style={btnStyle("outline")}
                  onClick={() => openEdit(p)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C9A84C";
                    e.currentTarget.style.color = "#C9A84C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                    e.currentTarget.style.color = "#F0E8D8";
                  }}
                >
                  Edit
                </button>
                <button
                  style={btnStyle("danger")}
                  onClick={() => handleDelete(p)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#C53030")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#E05252")
                  }
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div
              className="col-span-full text-center py-20"
              style={{ color: "#9080A8" }}
            >
              <div className="text-4xl mb-3 opacity-40">🍞</div>
              <p className="text-[0.86rem]">No products yet.</p>
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Product" : "Add Product"}
      >
        <p className="text-[0.78rem] mb-4" style={{ color: "#9080A8" }}>
          Fill in the details below. Changes apply to future orders only.
        </p>
        <TextInput
          label="Product Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Milky Cheese Balls"
        />
        <SelectInput
          label="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          options={CATEGORY_OPTIONS}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Price (₱)"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="0.00"
          />
          <TextInput
            label="Daily Stock Limit"
            type="number"
            min="0"
            value={form.dailyStockLimit}
            onChange={(e) =>
              setForm({ ...form, dailyStockLimit: e.target.value })
            }
            placeholder="Unlimited"
          />
        </div>
        <div className="mb-4">
          <label className="label">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImage}
            className="text-[0.82rem] w-full"
            style={{ color: "#9080A8" }}
          />
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-3 mb-5">
          <label className="relative w-9 h-5 flex-shrink-0 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.isAvailable}
              onChange={(e) =>
                setForm({ ...form, isAvailable: e.target.checked })
              }
            />
            <div
              className="w-9 h-5 rounded-full transition-colors duration-200"
              style={{ background: form.isAvailable ? "#3DBD87" : "#5A4870" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                style={{
                  transform: form.isAvailable
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
            Active (visible to customers)
          </span>
        </div>
        <div
          className="flex gap-3 justify-end pt-2"
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
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </Modal>
    </AdminLayout>
  );
}
