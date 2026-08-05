import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: "📊" },
      { to: "/admin/orders", label: "Orders", icon: "📦" },
    ],
  },
  {
    label: "Manage",
    items: [
      { to: "/admin/products", label: "Products", icon: "🥐" },
      { to: "/admin/staff", label: "Staff", icon: "👥" },
      { to: "/admin/payments", label: "Payments", icon: "💳" },
      { to: "/admin/pickup-times", label: "Pickup Times", icon: "🕐" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/admin/reports", label: "Reports", icon: "📈" },
      { to: "/admin/audit", label: "Audit Log", icon: "📋" },
    ],
  },
];

const PAGE_TITLES = {
  "/admin/dashboard": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/products": "Products",
  "/admin/staff": "Staff Accounts",
  "/admin/payments": "Payments",
  "/admin/reports": "Sales Reports",
  "/admin/audit": "Audit Logs",
  "/admin/pickup-times": "Pickup Time Slots",
};

export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("admin_sidebar_collapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] || "Admin";
  const initials = user?.email ? user.email.charAt(0).toUpperCase() : "A";
  const effectiveCollapsed = isDesktop && collapsed;
  const sbW = effectiveCollapsed ? "64px" : "240px";

  const navItemBase = {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "10px 18px",
    fontSize: "0.81rem",
    fontWeight: 500,
    borderLeft: "3px solid transparent",
    transition: "all 0.18s",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textDecoration: "none",
    cursor: "pointer",
    background: "transparent",
    border: "none",
    width: "100%",
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#120B22", color: "#F0E8D8" }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[49] backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ══════════════════════════
          SIDEBAR
      ══════════════════════════ */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 flex flex-col h-full flex-shrink-0 z-50 transition-all duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: sbW,
          background: "#0D0820",
          borderRight: "1px solid rgba(201,168,76,0.12)",
        }}
      >
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() =>
            setCollapsed((c) => {
              const next = !c;
              localStorage.setItem("admin_sidebar_collapsed", String(next));
              return next;
            })
          }
          className="hidden md:flex absolute top-5 -right-3 z-10 w-6 h-6 rounded-full items-center justify-center text-[0.65rem] font-bold"
          style={{
            background: "#C9A84C",
            color: "#1A0F2E",
            border: "2px solid #120B22",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            transform: effectiveCollapsed ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.25s",
          }}
        >
          ‹
        </button>

        {/* Brand */}
        <div
          className="flex items-center gap-2.5 px-4 py-5 flex-shrink-0 overflow-hidden"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}
        >
          <img
            src={hiddenOvenLogo}
            alt="The Hidden Oven logo"
            className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            style={{
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          />
          {!effectiveCollapsed && (
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
                Admin Portal
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav
          className="flex-1 overflow-y-auto py-2"
          style={{ scrollbarWidth: "none" }}
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!effectiveCollapsed && (
                <div
                  className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
                  style={{ color: "rgba(240,232,220,0.28)" }}
                >
                  {section.label}
                </div>
              )}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    ...navItemBase,
                    background: isActive
                      ? "rgba(201,168,76,0.18)"
                      : "transparent",
                    color: isActive ? "#E8C96D" : "rgba(240,232,220,0.55)",
                    borderLeft: `3px solid ${isActive ? "#C9A84C" : "transparent"}`,
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.getAttribute("aria-current")) {
                      e.currentTarget.style.background =
                        "rgba(201,168,76,0.09)";
                      e.currentTarget.style.color = "#E8C96D";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.getAttribute("aria-current")) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "rgba(240,232,220,0.55)";
                    }
                  }}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="text-[1.1rem] w-[22px] text-center flex-shrink-0">
                    {item.icon}
                  </span>
                  {!effectiveCollapsed && (
                    <span className="overflow-hidden">{item.label}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Logout */}
          {!effectiveCollapsed && (
            <>
              <div
                className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
                style={{ color: "rgba(240,232,220,0.28)" }}
              >
                Account
              </div>
              <button
                onClick={logout}
                style={{ ...navItemBase, color: "rgba(240,232,220,0.55)" }}
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

        {/* Footer */}
        <div
          className="flex items-center gap-2.5 px-4 py-3.5 flex-shrink-0 overflow-hidden"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <img
            src={hiddenOvenLogo}
            alt={`${initials} admin logo`}
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          />
          {!effectiveCollapsed && (
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <div
                className="text-[0.78rem] font-semibold truncate"
                style={{ color: "#E8C96D" }}
              >
                {user?.email || "Admin"}
              </div>
              <div
                className="text-[0.65rem] mt-0.5"
                style={{ color: "rgba(240,232,220,0.38)" }}
              >
                Administrator
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════
          MAIN
      ══════════════════════════ */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Topbar */}
        <div
          className="flex items-center gap-3 px-5 h-[54px] flex-shrink-0 sticky top-0 z-40"
          style={{
            background: "#1E1235",
            borderBottom: "1px solid rgba(201,168,76,0.18)",
          }}
        >
          <button
            className="md:hidden flex items-center p-1"
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
            {pageTitle}
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
