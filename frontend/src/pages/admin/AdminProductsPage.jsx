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
  imagePreview: "",
  imageFit: "cover",
  imagePosition: "center",
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
    fontFamily: "Google Sans,Arial,sans-serif",
  };
  if (v === "outline")
    return {
      ...b,
      background: "transparent",
      color: "#17151D",
      border: "1.5px solid rgba(70,44,125,0.3)",
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
      imagePreview: p.imageUrl || "",
      imageFit: p.imageFit || "cover",
      imagePosition: p.imagePosition || "center",
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
        imagePreview: r.result,
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
        imageFit: form.imageFit,
        imagePosition: form.imagePosition,
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
    if (!confirm(`Delete "${p.name}" from the active catalog?`)) return;
    try {
      await api.deleteProduct(p.productId);
      showToast("Product deleted.", "success");
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
            style={{ color: "#462C7D" }}
          >
            Products
          </h2>
          <p className="text-[0.78rem] mt-0.5" style={{ color: "#6F6B78" }}>
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
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {products.map((p) => (
            <div
              key={p.productId}
              className="flex flex-col overflow-hidden rounded-xl transition-all duration-200"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(70,44,125,0.18)",
                boxShadow: "0 2px 12px rgba(23,21,29,0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 24px rgba(23,21,29,0.10)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(23,21,29,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Image */}
              <div
                className="h-36 flex items-center justify-center relative overflow-hidden"
                style={{ background: "#F4F1F8" }}
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    style={{ objectFit: p.imageFit || "cover", objectPosition: p.imagePosition || "center" }}
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
                          background: "#FFFFFF",
                          color: "#6F6B78",
                          border: "1px solid rgba(70,44,125,0.09)",
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
                  style={{ color: "#17151D" }}
                >
                  {p.name}
                </div>
                <div
                  className="text-[0.74rem] capitalize mb-1"
                  style={{ color: "#6F6B78" }}
                >
                  {p.category}
                </div>
                {p.dailyStockLimit && (
                  <div
                    className="rounded-lg p-2 mb-2 text-[0.72rem]"
                    style={{
                      background: "rgba(70,44,125,0.07)",
                      border: "1px solid rgba(70,44,125,0.14)",
                      color: "#6F6B78",
                    }}
                  >
                    <div>Stock limit: {p.dailyStockLimit}</div>
                    <div>Ordered today: {p.dailyStockUsed || 0}</div>
                    <div style={{ color: p.dailyStockRemaining <= 0 ? "#E05252" : "#462C7D" }}>
                      Remaining: {p.dailyStockRemaining ?? p.dailyStockLimit}
                    </div>
                  </div>
                )}
                <div
                  className="font-bold text-[1rem] mt-auto mb-3"
                  style={{ color: "#462C7D" }}
                >
                  ₱{p.price?.toFixed(2)}
                </div>
              </div>

              {/* Footer actions */}
              <div
                className="grid grid-cols-2 gap-2 px-4 pb-4"
                style={{
                  borderTop: "1px solid rgba(70,44,125,0.09)",
                  paddingTop: "12px",
                }}
              >
                <button
                  style={btnStyle("outline")}
                  onClick={() => openEdit(p)}
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
                  style={btnStyle("danger")}
                  onClick={() => handleDelete(p)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#C53030")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#E05252")
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div
              className="col-span-full text-center py-20"
              style={{ color: "#6F6B78" }}
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
        <p className="text-[0.78rem] mb-4" style={{ color: "#6F6B78" }}>
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
            style={{ color: "#6F6B78" }}
          />
          {form.imagePreview && (
            <div className="mt-3 h-44 overflow-hidden rounded-xl border border-[#E8E6ED] bg-[#F4F1F8]">
              <img src={form.imagePreview} alt="Catalog image preview" className="h-full w-full" style={{ objectFit: form.imageFit, objectPosition: form.imagePosition }} />
            </div>
          )}
        </div>
        <fieldset className="mb-4">
          <legend className="label">Catalog Image Display</legend>
          <div className="grid grid-cols-2 gap-2">
            {[{ value: "cover", label: "Crop / Fill" }, { value: "contain", label: "Fit Entire Image" }].map((option) => (
              <label key={option.value} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${form.imageFit === option.value ? "border-[#462C7D] bg-[#F4F1F8] text-[#462C7D]" : "border-[#E8E6ED] text-[#6F6B78]"}`}>
                <input type="radio" name="image-fit" value={option.value} checked={form.imageFit === option.value} onChange={(e) => setForm({ ...form, imageFit: e.target.value })} className="accent-[#462C7D]" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        <SelectInput
          label="Image Focus"
          value={form.imagePosition}
          onChange={(e) => setForm({ ...form, imagePosition: e.target.value })}
          options={[
            { value: "center", label: "Center" },
            { value: "top", label: "Top" },
            { value: "bottom", label: "Bottom" },
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
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
              style={{ background: form.isAvailable ? "#3DBD87" : "#AAA6B0" }}
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
            style={{ color: "#17151D" }}
          >
            Active (visible to customers)
          </span>
        </div>
        <div
          className="flex gap-3 justify-end pt-2"
          style={{ borderTop: "1px solid rgba(70,44,125,0.12)" }}
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
