import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { Spinner } from "../../components/ui/Spinner";
import { getDailyStockRemaining } from "../../lib/date";

const CATEGORIES = ["All", "Bread", "Pastry", "Cake"];

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const { items, addItem } = useCart();

  useEffect(() => {
    const q = query(collection(db, "products"), where("isAvailable", "==", true));
    const unsubscribe = onSnapshot(q, (snap) => {
      setProducts(snap.docs.map((d) => ({ productId: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered =
    category === "All"
      ? products
      : products.filter(
          (p) => p.category.toLowerCase() === category.toLowerCase(),
        );

  function handleAdd(product) {
    const remaining = getDailyStockRemaining(product);
    const inCart = items.find((i) => i.productId === product.productId)?.qty || 0;
    if (remaining !== null && inCart >= remaining) return;
    addItem(product);
  }

  return (
    <CustomerLayout>
      {/* Hero */}
      <div className="mb-8">
        <p
          className="text-[0.7rem] font-bold uppercase tracking-[1.5px] mb-2"
          style={{ color: "#C9A84C" }}
        >
          Fresh Today
        </p>
        <h1
          className="font-display text-3xl font-bold mb-2"
          style={{ color: "#E8C96D" }}
        >
          Fresh from the oven.
        </h1>
        <p className="text-sm" style={{ color: "rgba(240,232,220,0.55)" }}>
          Order ahead for same-day or next-day pickup.
        </p>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-4 py-1.5 rounded-full text-[0.78rem] font-semibold border transition-all duration-150"
            style={
              category === cat
                ? {
                    background: "#C9A84C",
                    color: "#1A0F2E",
                    borderColor: "#C9A84C",
                  }
                : {
                    background: "transparent",
                    color: "rgba(240,232,220,0.55)",
                    borderColor: "rgba(201,168,76,0.25)",
                  }
            }
            onMouseEnter={(e) => {
              if (category !== cat) {
                e.currentTarget.style.borderColor = "#C9A84C";
                e.currentTarget.style.color = "#E8C96D";
              }
            }}
            onMouseLeave={(e) => {
              if (category !== cat) {
                e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)";
                e.currentTarget.style.color = "rgba(240,232,220,0.55)";
              }
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <Spinner className="py-20" />
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-20"
          style={{ color: "rgba(240,232,220,0.35)" }}
        >
          <div className="text-4xl mb-3 opacity-50">🍞</div>
          <p className="text-sm">No items available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {filtered.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              cartQty={items.find((i) => i.productId === product.productId)?.qty || 0}
              onAdd={handleAdd}
            />
          ))}
        </div>
      )}
    </CustomerLayout>
  );
}

function ProductCard({ product, cartQty, onAdd }) {
  const remaining = getDailyStockRemaining(product);
  const outOfStock = remaining !== null && cartQty >= remaining;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-card transition-all duration-200"
      style={{
        background: "#1E1235",
        border: "1px solid rgba(201,168,76,0.18)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        opacity: outOfStock ? 0.68 : 1,
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
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-36 md:h-44 object-cover"
                  style={{ background: "#261748" }}
                />
              ) : (
                <div
                  className="w-full h-36 md:h-44 flex items-center justify-center text-4xl"
                  style={{ background: "#261748" }}
                >
                  🍞
                </div>
              )}

              {/* Body */}
              <div className="flex flex-col flex-1 p-3 md:p-4">
                <p
                  className="text-[0.68rem] font-bold uppercase tracking-[0.5px] mb-1"
                  style={{ color: "#C9A84C" }}
                >
                  {product.category}
                </p>
                <h3
                  className="font-semibold text-[0.9rem] mb-1"
                  style={{ color: "#F0E8D8" }}
                >
                  {product.name}
                </h3>

                {/* Description — only rendered if present in Firestore */}
                {product.description && (
                  <p
                    className="text-[0.76rem] mb-2 line-clamp-2"
                    style={{ color: "rgba(240,232,220,0.45)" }}
                  >
                    {product.description}
                  </p>
                )}

                <p
                  className="font-bold text-[1rem] mb-4"
                  style={{ color: "#C9A84C" }}
                >
                  ₱{product.price.toFixed(2)}
                </p>

                {remaining !== null && (
                  <p className="text-[0.72rem] mb-3" style={{ color: outOfStock ? "#E05252" : "#9080A8" }}>
                    Stock left today: {Math.max(0, remaining - cartQty)}
                  </p>
                )}

                <button
                  onClick={() => onAdd(product)}
                  disabled={outOfStock}
                  className="mt-auto w-full text-[0.8rem] font-semibold py-2 rounded-lg transition-all duration-150"
                  style={{
                    background: outOfStock ? "#5A4870" : "#C9A84C",
                    color: outOfStock ? "#F0E8D8" : "#1A0F2E",
                    cursor: outOfStock ? "not-allowed" : "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (outOfStock) return;
                    e.currentTarget.style.background = "#E8C96D";
                    e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(201,168,76,0.30)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = outOfStock ? "#5A4870" : "#C9A84C";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {outOfStock ? "Out of Stock" : "Add Item"}
                </button>
              </div>
    </div>
  );
}
