import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BrandMark } from "../ui/BrandMark";

const NAV_SECTIONS = [
  { label: "Overview", items: [{ to: "/admin/dashboard", label: "Dashboard", icon: "◫" }, { to: "/admin/orders", label: "Orders", icon: "▣" }] },
  { label: "Manage", items: [{ to: "/admin/products", label: "Products", icon: "◇" }, { to: "/admin/staff", label: "Staff", icon: "◎" }, { to: "/admin/payments", label: "Payments", icon: "▤" }, { to: "/admin/pickup-times", label: "Pickup Times", icon: "◷" }] },
  { label: "Analytics", items: [{ to: "/admin/reports", label: "Reports", icon: "⌁" }, { to: "/admin/audit", label: "Audit Log", icon: "☷" }] },
];
const PAGE_TITLES = { "/admin/dashboard": "Dashboard", "/admin/orders": "Orders", "/admin/products": "Products", "/admin/staff": "Staff Accounts", "/admin/payments": "Payments", "/admin/reports": "Sales Reports", "/admin/audit": "Audit Logs", "/admin/pickup-times": "Pickup Time Slots" };

export function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("admin_sidebar_collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const compact = isDesktop && collapsed;
  const title = PAGE_TITLES[location.pathname] || "Admin";
  const initials = user?.email?.charAt(0).toUpperCase() || "A";

  return (
    <div className="portal-ui flex h-screen overflow-hidden">
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#17151D]/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`portal-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 md:relative ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`} style={{ width: compact ? 76 : 252 }}>
        <button type="button" aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} className="absolute -right-3 top-6 hidden h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FACC15] text-xs font-bold text-black shadow md:flex" onClick={() => setCollapsed((current) => { const next = !current; localStorage.setItem("admin_sidebar_collapsed", String(next)); return next; })}>{compact ? "›" : "‹"}</button>
        <div className="border-b border-white/10 p-4"><BrandMark light compact portal={compact ? undefined : "Admin"} /></div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Admin navigation">
          {NAV_SECTIONS.map((section) => <div key={section.label} className="mb-4">{!compact && <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white/45">{section.label}</p>}{section.items.map((item) => <NavLink key={item.to} to={item.to} title={item.label} onClick={() => setMobileOpen(false)} className={({ isActive }) => `mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-white text-[#462C7D]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}><span className="flex w-6 shrink-0 justify-center text-lg" aria-hidden="true">{item.icon}</span>{!compact && <span className="truncate">{item.label}</span>}</NavLink>)}</div>)}
        </nav>
        <div className="border-t border-white/10 p-3"><div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#462C7D]">{initials}</span>{!compact && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{user?.email || "Admin"}</p><p className="mt-0.5 text-[0.65rem] text-white/50">Administrator</p></div><button type="button" onClick={logout} className="rounded-lg px-2 py-1 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white">Logout</button></>}</div></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar flex h-[68px] shrink-0 items-center gap-3 px-4 sm:px-6"><button type="button" aria-label="Open admin navigation" onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#462C7D] hover:bg-[#F4F1F8] md:hidden">☰</button><div className="min-w-0 flex-1"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#817C89]">Admin portal</p><h1 className="truncate text-xl font-bold">{title}</h1></div><span className="hidden rounded-full bg-[#F4F1F8] px-3 py-2 text-xs font-semibold text-[#462C7D] sm:block">Live workspace</span></header>
        <main className="portal-content flex-1 overflow-y-auto p-4 pb-16 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
