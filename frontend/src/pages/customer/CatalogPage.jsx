import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { Spinner } from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";

const CATEGORIES = ["All", "Bread", "Pastry", "Cake"];

export default function CatalogPage() {
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState("All");
  const { addItem }               = useCart();
  const { showToast, ToastContainer } = useToast();

  useEffect(() => {
    async function fetchProducts() {
      const snap = await getDocs(
        query(collection(db, "products"), where("isAvailable", "==", true))
      );
      setProducts(snap.docs.map((d) => ({ productId: d.id, ...d.data() })));
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const filtered = category === "All"
    ? products
    : products.filter((p) => p.category.toLowerCase() === category.toLowerCase());

  function handleAdd(product) {
    addItem(product);
    showToast(`${product.name} added to cart.`, "success");
  }

  return (
    <CustomerLayout>
      <ToastContainer />

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-neutral-900 mb-2">
          Fresh from the oven.
        </h1>
        <p className="text-neutral-500">Order ahead for same-day or next-day pickup.</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              category === cat
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-neutral-600 border-neutral-300 hover:border-brand-400"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <Spinner className="py-20" />
      ) : filtered.length === 0 ? (
        <p className="text-neutral-500 text-center py-20">No items available in this category.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((product) => (
            <div key={product.productId} className="card flex flex-col">
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-44 object-cover rounded-lg mb-4 bg-neutral-100"
                />
              )}
              <div className="flex-1">
                <p className="text-xs text-brand-500 font-semibold uppercase tracking-wide mb-1">
                  {product.category}
                </p>
                <h3 className="font-semibold text-neutral-900 mb-1">{product.name}</h3>
                <p className="text-brand-600 font-bold text-lg mb-4">
                  ₱{product.price.toFixed(2)}
                </p>
              </div>
              <button onClick={() => handleAdd(product)} className="btn-primary w-full text-sm">
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}
