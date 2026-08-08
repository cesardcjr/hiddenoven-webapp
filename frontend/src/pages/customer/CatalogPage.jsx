import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useCart } from "../../context/CartContext";
import { CustomerLayout } from "../../components/layout/CustomerLayout";
import { Modal } from "../../components/ui/Modal";
import { Spinner } from "../../components/ui/Spinner";
import { getDailyStockRemaining } from "../../lib/date";
import { ShoppingCartIcon } from "../../components/ui/Icons";
import { Swal } from "../../lib/swal";

const CATEGORIES = ["All", "Bread", "Pastry", "Cake"];

export default function CatalogPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [quantities, setQuantities] = useState({});
  const { items, addItem } = useCart();

  useEffect(() => {
    const productsQuery = query(collection(db, "products"), where("isAvailable", "==", true));
    return onSnapshot(productsQuery, (snapshot) => {
      setProducts(snapshot.docs.map((doc) => ({ productId: doc.id, ...doc.data() })));
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => products.filter((product) => {
    const matchesCategory = category === "All" || product.category?.toLowerCase() === category.toLowerCase();
    const term = search.trim().toLowerCase();
    return matchesCategory && (!term || product.name?.toLowerCase().includes(term) || product.description?.toLowerCase().includes(term));
  }), [products, category, search]);

  function availableToAdd(product) {
    const remaining = getDailyStockRemaining(product);
    const inCart = items.find((item) => item.productId === product.productId)?.qty || 0;
    return remaining === null ? Number.POSITIVE_INFINITY : Math.max(0, remaining - inCart);
  }

  function isOutOfStock(product) { return availableToAdd(product) === 0; }
  function quantityFor(product) { return quantities[product.productId] || 1; }
  function changeQuantity(product, delta) {
    const available = availableToAdd(product);
    if (available === 0) return;
    setQuantities((current) => {
      const next = Math.max(1, (current[product.productId] || 1) + delta);
      return { ...current, [product.productId]: Number.isFinite(available) ? Math.min(next, available) : next };
    });
  }
  async function handleAdd(product) {
    if (isOutOfStock(product)) return;
    addItem(product, quantityFor(product));
    setQuantities((current) => ({ ...current, [product.productId]: 1 }));
    const result = await Swal.fire({
      title: "Added to Cart",
      icon: "success",
      text: "Proceed to Checkout?",
      draggable: true,
      showCancelButton: true,
      confirmButtonText: "Okay",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#462C7D",
    });
    if (result.isConfirmed) navigate("/cart");
  }

  return (
    <CustomerLayout>
      <header className="mb-7 sm:mb-9">
        <p className="page-eyebrow">Our menu</p>
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><h1 className="page-title">Specially baked for you</h1><p className="page-subtitle">Discover today’s small-batch selection and reserve your favorites for pickup.</p></div>
          <label className="relative block w-full md:max-w-sm">
            <span className="sr-only">Search the menu</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#817C89]">⌕</span>
            <input className="input rounded-full pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search our menu" />
          </label>
        </div>
      </header>

      <div className="mb-7 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product categories">
        {CATEGORIES.map((item) => (
          <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold transition-colors ${category === item ? "border-[#462C7D] bg-[#462C7D] text-white" : "border-[#E8E6ED] bg-white text-[#6F6B78] hover:border-[#CFC4E2] hover:text-[#462C7D]"}`}>{item}</button>
        ))}
      </div>

      {loading ? <Spinner className="py-24" /> : filtered.length === 0 ? (
        <div className="surface-card py-20 text-center"><div className="mb-4 text-4xl" aria-hidden="true">◌</div><h2 className="text-lg font-bold">Nothing found</h2><p className="mt-2 text-sm text-[#6F6B78]">Try another category or search term.</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => <ProductCard key={product.productId} product={product} outOfStock={isOutOfStock(product)} quantity={quantityFor(product)} available={availableToAdd(product)} onQuantity={changeQuantity} onOpen={setSelected} onAdd={handleAdd} />)}
        </div>
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || "Item details"}>
        {selected && (
          <div>
            <div className="mb-5 aspect-[4/3] overflow-hidden rounded-2xl bg-[#F4F1F8]">
              {selected.imageUrl ? <img src={selected.imageUrl} alt={selected.name} className="h-full w-full" style={{ objectFit: selected.imageFit || "cover", objectPosition: selected.imagePosition || "center" }} /> : <div className="flex h-full items-center justify-center text-5xl">🥐</div>}
            </div>
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[#462C7D]">{selected.category}</p><p className="mt-2 text-sm leading-6 text-[#6F6B78]">{selected.description || "Freshly prepared in small batches for your scheduled pickup."}</p></div><p className="shrink-0 text-lg font-bold text-[#462C7D]">₱{Number(selected.price).toFixed(2)}</p></div>
            {!isOutOfStock(selected) && <QuantityStepper quantity={quantityFor(selected)} canIncrease={!Number.isFinite(availableToAdd(selected)) || quantityFor(selected) < availableToAdd(selected)} onDecrease={() => changeQuantity(selected, -1)} onIncrease={() => changeQuantity(selected, 1)} className="mt-5" />}
            <button className="btn-primary mt-5 w-full" disabled={isOutOfStock(selected)} onClick={() => { handleAdd(selected); setSelected(null); }}><ShoppingCartIcon />{isOutOfStock(selected) ? "Sold Out" : "Add to Cart"}</button>
          </div>
        )}
      </Modal>
    </CustomerLayout>
  );
}

function QuantityStepper({ quantity, canIncrease, onDecrease, onIncrease, className = "" }) {
  return <div className={`flex w-fit items-center rounded-full border border-[#E8E6ED] bg-white p-1 ${className}`}><button type="button" aria-label="Decrease quantity" onClick={onDecrease} disabled={quantity <= 1} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#462C7D] hover:bg-[#F4F1F8] disabled:text-[#AAA6B0]">−</button><span className="w-8 text-center text-sm font-bold">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={onIncrease} disabled={!canIncrease} className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#462C7D] hover:bg-[#F4F1F8] disabled:text-[#AAA6B0]">+</button></div>;
}

function ProductCard({ product, outOfStock, quantity, available, onQuantity, onOpen, onAdd }) {
  return (
    <article className={`group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E8E6ED] bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-card-md ${outOfStock ? "opacity-65" : ""}`}>
      <button type="button" onClick={() => onOpen(product)} className="block aspect-square overflow-hidden bg-[#F4F1F8] text-left" aria-label={`View ${product.name} details`}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full transition-transform duration-500 group-hover:scale-105" style={{ objectFit: product.imageFit || "cover", objectPosition: product.imagePosition || "center" }} /> : <span className="flex h-full items-center justify-center text-5xl">🥐</span>}
      </button>
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#817C89]">{product.category}</p>
        <button type="button" onClick={() => onOpen(product)} className="mt-1.5 text-left"><h2 className="line-clamp-2 text-sm font-bold leading-snug sm:text-base">{product.name}</h2></button>
        <p className="mt-2 text-sm font-bold text-[#462C7D]">₱{Number(product.price).toFixed(2)}</p>
        {!outOfStock && <QuantityStepper quantity={quantity} canIncrease={!Number.isFinite(available) || quantity < available} onDecrease={() => onQuantity(product, -1)} onIncrease={() => onQuantity(product, 1)} className="mt-4 self-center" />}
        <button type="button" onClick={() => onAdd(product)} disabled={outOfStock} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[#462C7D] px-3 text-xs font-bold text-white transition-colors hover:bg-[#35205F] disabled:bg-[#D2CFD8] disabled:text-[#6F6B78]"><ShoppingCartIcon className="h-4 w-4" />{outOfStock ? "Sold Out" : "Add to Cart"}</button>
      </div>
    </article>
  );
}
