import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";

export function CustomerLayout({ children }) {
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-bold text-brand-600">
            The Hidden Oven
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/track" className="text-sm text-neutral-600 hover:text-brand-600 font-medium">
              Track Order
            </Link>
            <button
              onClick={() => navigate("/cart")}
              className="relative btn-primary text-sm py-1.5"
            >
              Cart
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {count}
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} The Hidden Oven. Made with care.
      </footer>
    </div>
  );
}
