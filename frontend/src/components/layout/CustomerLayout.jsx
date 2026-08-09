import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { BrandMark } from "../ui/BrandMark";
import { ShoppingCartIcon } from "../ui/Icons";

const navItems = [
  { to: "/", label: "Home", icon: "⌂" },
  { to: "/catalog", label: "Menu", icon: "▦" },
  { to: "/track", label: "Track", icon: "◎" },
];

export function CustomerLayout({ children }) {
  const { count } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!count) return;
    const badge = document.getElementById("cart-badge");
    if (!badge) return;
    badge.classList.remove("cart-badge-pop");
    void badge.offsetWidth;
    badge.classList.add("cart-badge-pop");
  }, [count]);

  return (
    <div className="customer-ui min-h-screen bg-white text-[#17151D]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#462C7D] text-white shadow-sm">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark light compact />
          <button type="button" onClick={() => navigate("/cart")} aria-label={`Open cart with ${count} items`} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#462C7D] sm:hidden">
            <ShoppingCartIcon />
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FACC15] px-1 text-[0.62rem] font-bold text-black">{count}</span>}
          </button>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Customer navigation">
            {navItems.slice(1, 3).map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-white text-[#462C7D]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>{item.label}</NavLink>
            ))}
            <button type="button" onClick={() => navigate("/cart")} className="relative ml-1 flex min-h-10 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#462C7D] transition-transform hover:-translate-y-0.5">
              <ShoppingCartIcon className="h-4 w-4" />
              Cart
              {count > 0 && <span id="cart-badge" className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FACC15] px-1 text-[0.68rem] font-bold text-black">{count}</span>}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-7 pb-28 sm:px-6 sm:py-10 sm:pb-12">{children}</main>

      <footer className="hidden border-t border-[#E8E6ED] bg-white py-7 text-center text-xs text-[#6F6B78] sm:block">
        © {new Date().getFullYear()} The Hidden Oven · Freshly baked for pickup
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 border-t border-[#E8E6ED] bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(23,21,29,0.07)] backdrop-blur sm:hidden" aria-label="Mobile customer navigation">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => `relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.65rem] font-semibold ${isActive ? "bg-[#F4F1F8] text-[#462C7D]" : "text-[#817C89]"}`}>
            <span aria-hidden="true" className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <style>{`@keyframes cartBadgePop { 0% { transform: scale(1); } 45% { transform: scale(1.35); } 100% { transform: scale(1); } } .cart-badge-pop { animation: cartBadgePop .3s ease; }`}</style>
    </div>
  );
}
