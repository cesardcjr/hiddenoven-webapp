import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";

export function CustomerLayout({ children }) {
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-plum-900">
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 md:px-8"
        style={{
          background: "#0D0820",
          borderBottom: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          className="font-display font-bold text-[1.05rem] tracking-wide"
          style={{ color: "#E8C96D" }}
        >
          The Hidden Oven
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-2">
          <Link
            to="/track"
            className="text-[0.8rem] font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{ color: "rgba(240,232,220,0.65)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#E8C96D";
              e.currentTarget.style.background = "rgba(201,168,76,0.09)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(240,232,220,0.65)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            Track Order
          </Link>

          <button
            onClick={() => navigate("/cart")}
            className="relative flex items-center gap-1.5 text-[0.8rem] font-semibold px-3.5 py-1.5 rounded-lg transition-all duration-150"
            style={{
              background: "#C9A84C",
              color: "#1A0F2E",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#E8C96D";
              e.currentTarget.style.boxShadow =
                "0 4px 16px rgba(201,168,76,0.30)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#C9A84C";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Cart
            {count > 0 && (
              <span
                className="absolute -top-2 -right-2 text-white text-[0.65rem] font-bold rounded-full h-5 w-5 flex items-center justify-center"
                style={{ background: "#E05252" }}
              >
                {count}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-8">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-6 text-center text-[0.75rem]"
        style={{
          borderTop: "1px solid rgba(201,168,76,0.12)",
          color: "rgba(240,232,220,0.35)",
        }}
      >
        © {new Date().getFullYear()} The Hidden Oven · Baked with care
      </footer>
    </div>
  );
}
