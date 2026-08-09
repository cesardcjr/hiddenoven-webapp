import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { BrandMark } from "../ui/BrandMark";
import { useNewOrderAlert } from "../../hooks/useNewOrderAlert";
import { OrderQueueIcon, PointOfSaleIcon } from "../ui/Icons";

export function StaffLayout({ children, orderCount = 0, statusItems = [], activeStatus = "", onStatusSelect, pageTitle = "" }) {
  useNewOrderAlert();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("staff_sidebar_collapsed") === "true");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync(); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  const compact = isDesktop && collapsed;
  const activeLabel = useMemo(() => statusItems.find((item) => item.status === activeStatus)?.label, [activeStatus, statusItems]);
  const initials = user?.email?.charAt(0).toUpperCase() || "S";

  function selectStatus(status) { onStatusSelect?.(status); setMobileOpen(false); }

  return (
    <div className="portal-ui flex h-screen overflow-hidden">
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#17151D]/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`portal-sidebar fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-200 md:relative ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`} style={{ width: compact ? 76 : 260 }}>
        <button type="button" aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} className="absolute -right-3 top-6 hidden h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#FACC15] text-xs font-bold text-black shadow md:flex" onClick={() => setCollapsed((current) => { const next = !current; localStorage.setItem("staff_sidebar_collapsed", String(next)); return next; })}>{compact ? "›" : "‹"}</button>
        <div className="border-b border-white/10 p-4"><BrandMark light compact portal={compact ? undefined : "Staff"} /></div>
        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Order status filters">
          {!compact && <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white/45">Workspace</p>}
          {statusItems.length === 0 && <NavLink to="/staff/orders" className={({ isActive }) => `mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-white text-[#462C7D]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}><span className="flex w-6 shrink-0 justify-center"><OrderQueueIcon /></span>{!compact && <span>Order Queues</span>}</NavLink>}
          <NavLink to="/staff/walk-in" className={({ isActive }) => `mb-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${isActive ? "bg-white text-[#462C7D]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}><span className="flex w-6 shrink-0 justify-center"><PointOfSaleIcon /></span>{!compact && <span>Walk-in Orders</span>}</NavLink>
          {!compact && statusItems.length > 0 && <p className="px-3 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.15em] text-white/45">Order queues</p>}
          {statusItems.map((item) => {
            const active = activeStatus === item.status;
            return <button key={item.status} type="button" title={item.label} onClick={() => selectStatus(item.status)} className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors ${active ? "bg-white text-[#462C7D]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}><span className="flex w-6 shrink-0 justify-center text-lg" aria-hidden="true">{item.icon || "○"}</span>{!compact && <span className="min-w-0 flex-1 truncate">{item.label}</span>}{item.count > 0 && <span className={`${compact ? "absolute ml-5 -mt-7" : ""} flex min-w-5 items-center justify-center rounded-full bg-[#FACC15] px-1.5 py-0.5 text-[0.62rem] font-bold text-black`}>{item.count}</span>}</button>;
          })}
        </nav>
        <div className="border-t border-white/10 p-3"><div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#462C7D]">{initials}</span>{!compact && <><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-white">{user?.email || "Staff"}</p><p className="mt-0.5 text-[0.65rem] text-white/50">Order team</p></div><button type="button" onClick={logout} className="rounded-lg px-2 py-1 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white">Logout</button></>}</div></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="portal-topbar flex h-[68px] shrink-0 items-center gap-3 px-4 sm:px-6"><button type="button" aria-label="Open staff navigation" onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-[#462C7D] hover:bg-[#F4F1F8] md:hidden">☰</button><div className="min-w-0 flex-1"><p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#817C89]">Staff portal</p><h1 className="truncate text-xl font-bold">{pageTitle || activeLabel || "Order queue"}</h1></div>{orderCount > 0 && <span className="rounded-full bg-[#462C7D] px-3 py-1.5 text-xs font-bold text-white">{orderCount} orders</span>}</header>
        <main className="portal-content flex-1 overflow-y-auto p-4 pb-16 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
