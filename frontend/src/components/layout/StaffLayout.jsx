import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/staff/orders", label: "Order Queue", icon: "📦", section: "Orders" },
];

export function StaffLayout({ children, orderCount = 0 }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("staff_sidebar_collapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  // Live date chip
  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    setDateStr(fmt());
    const t = setInterval(() => setDateStr(fmt()), 60000);
    return () => clearInterval(t);
  }, []);

  const initials = user?.email ? user.email.charAt(0).toUpperCase() : "S";

  const sbW = collapsed ? "64px" : "240px";

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#120B22", color: "#F0E8D8" }}
    >
      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[49] backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════════
          SIDEBAR
      ══════════════════════════════ */}
      <aside
        className="flex flex-col h-full flex-shrink-0 relative z-50 transition-all duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]"
        style={{
          width: sbW,
          background: "#0D0820",
          borderRight: "1px solid rgba(201,168,76,0.12)",
          // Mobile: slide in/out
        }}
      >
        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() =>
            setCollapsed((c) => {
              const next = !c;
              localStorage.setItem("staff_sidebar_collapsed", String(next));
              return next;
            })
          }
          className="hidden md:flex absolute top-5 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center text-[0.65rem] font-bold transition-transform duration-[250ms]"
          style={{
            background: "#C9A84C",
            color: "#1A0F2E",
            border: "2px solid #120B22",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ‹
        </button>

        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-4 py-5 flex-shrink-0 overflow-hidden"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
            style={{
              background: "rgba(201,168,76,0.15)",
              color: "#C9A84C",
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          >
            HO
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <span
                className="font-display font-bold text-[0.95rem] tracking-[0.3px] block"
                style={{ color: "#E8C96D" }}
              >
                The Hidden Oven
              </span>
              <span
                className="text-[0.58rem] tracking-[1.5px] uppercase block mt-0.5"
                style={{ color: "rgba(201,168,76,0.45)" }}
              >
                Staff Portal
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto py-2.5"
          style={{ scrollbarWidth: "none" }}
        >
          {!collapsed && (
            <div
              className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
              style={{ color: "rgba(240,232,220,0.28)" }}
            >
              Orders
            </div>
          )}

          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-[11px] px-[18px] py-2.5 text-[0.81rem] font-medium
                 border-l-[3px] transition-all duration-[180ms] overflow-hidden whitespace-nowrap
                 ${isActive ? "border-l-[#C9A84C]" : "border-l-transparent"}`
              }
              style={({ isActive }) => ({
                background: isActive ? "rgba(201,168,76,0.18)" : "transparent",
                color: isActive ? "#E8C96D" : "rgba(240,232,220,0.55)",
              })}
              onMouseEnter={(e) => {
                const a = e.currentTarget.getAttribute("aria-current");
                if (!a) {
                  e.currentTarget.style.background = "rgba(201,168,76,0.09)";
                  e.currentTarget.style.color = "#E8C96D";
                }
              }}
              onMouseLeave={(e) => {
                const a = e.currentTarget.getAttribute("aria-current");
                if (!a) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(240,232,220,0.55)";
                }
              }}
            >
              <span className="text-[1.1rem] w-[22px] text-center flex-shrink-0">
                {item.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="overflow-hidden">{item.label}</span>
                  {orderCount > 0 && (
                    <span
                      className="ml-auto text-[0.65rem] font-bold rounded-full px-[7px] py-[1px] flex-shrink-0"
                      style={{ background: "#C9A84C", color: "#1A0F2E" }}
                    >
                      {orderCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* History — future nav item placeholder */}
          {!collapsed && (
            <>
              <div
                className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
                style={{ color: "rgba(240,232,220,0.28)" }}
              >
                Account
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-[11px] px-[18px] py-2.5 text-[0.81rem] font-medium
                           border-l-[3px] border-l-transparent transition-all duration-[180ms]"
                style={{ color: "rgba(240,232,220,0.55)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(201,168,76,0.09)";
                  e.currentTarget.style.color = "#E8C96D";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(240,232,220,0.55)";
                }}
              >
                <span className="text-[1.1rem] w-[22px] text-center flex-shrink-0">
                  🚪
                </span>
                <span>Logout</span>
              </button>
            </>
          )}
        </nav>

        {/* Footer — avatar + email */}
        <div
          className="flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0 overflow-hidden"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.82rem] font-bold flex-shrink-0"
            style={{ background: "#C9A84C", color: "#1A0F2E" }}
          >
            {initials}
          </div>
          {!collapsed && (
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <div
                className="text-[0.78rem] font-semibold truncate"
                style={{ color: "#E8C96D" }}
              >
                {user?.email || "Staff"}
              </div>
              <div
                className="text-[0.65rem] mt-0.5"
                style={{ color: "rgba(240,232,220,0.38)" }}
              >
                Staff Member
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════
          MAIN
      ══════════════════════════════ */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <div
          className="flex items-center gap-3 px-5 h-[54px] flex-shrink-0 sticky top-0 z-40"
          style={{
            background: "#1E1235",
            borderBottom: "1px solid rgba(201,168,76,0.18)",
          }}
        >
          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center p-1 transition-colors"
            style={{
              background: "none",
              border: "none",
              color: "rgba(240,232,220,0.45)",
              fontSize: "1.3rem",
              cursor: "pointer",
            }}
            onClick={() => setMobileOpen(true)}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C9A84C")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(240,232,220,0.45)")
            }
          >
            ☰
          </button>

          <span
            className="font-display font-bold text-[1.1rem] flex-1 truncate"
            style={{ color: "#E8C96D" }}
          >
            Order Queue
          </span>

          {dateStr && (
            <span
              className="text-[0.73rem] whitespace-nowrap hidden sm:block"
              style={{ color: "#9080A8" }}
            >
              {dateStr}
            </span>
          )}
        </div>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
