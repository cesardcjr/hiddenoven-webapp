import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import hiddenOvenLogo from "../../images/hidden-oven-logo.jpg";

export function StaffLayout({
  children,
  orderCount = 0,
  statusItems = [],
  activeStatus = "",
  onStatusSelect,
}) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("staff_sidebar_collapsed") === "true",
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 768px)").matches,
  );
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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
  const effectiveCollapsed = isDesktop && collapsed;
  const sbW = effectiveCollapsed ? "68px" : "250px";
  const activeLabel = useMemo(
    () => statusItems.find((item) => item.status === activeStatus)?.label,
    [activeStatus, statusItems],
  );

  function selectStatus(status) {
    onStatusSelect?.(status);
    setMobileOpen(false);
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#120B22", color: "#F0E8D8" }}
    >
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[49] backdrop-blur-sm md:hidden"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 flex h-full flex-shrink-0 flex-col transition-all duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: sbW,
          background: "#0D0820",
          borderRight: "1px solid rgba(201,168,76,0.12)",
          boxShadow: mobileOpen ? "12px 0 35px rgba(0,0,0,0.45)" : "none",
        }}
      >
        <button
          onClick={() =>
            setCollapsed((c) => {
              const next = !c;
              localStorage.setItem("staff_sidebar_collapsed", String(next));
              return next;
            })
          }
          className="hidden md:flex absolute top-5 -right-3 z-10 h-6 w-6 items-center justify-center rounded-full text-[0.65rem] font-bold transition-transform duration-[250ms]"
          style={{
            background: "#C9A84C",
            color: "#1A0F2E",
            border: "2px solid #120B22",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            transform: effectiveCollapsed ? "rotate(180deg)" : "rotate(0deg)",
          }}
          aria-label="Collapse staff sidebar"
        >
          ‹
        </button>

        <div
          className="flex items-center gap-2.5 px-4 py-5 flex-shrink-0 overflow-hidden"
          style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}
        >
          <img
            src={hiddenOvenLogo}
            alt="The Hidden Oven logo"
            className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
            style={{
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          />
          {!effectiveCollapsed && (
            <div className="overflow-hidden whitespace-nowrap">
              <span
                className="font-display block text-[0.95rem] font-bold tracking-[0.3px]"
                style={{ color: "#E8C96D" }}
              >
                The Hidden Oven
              </span>
              <span
                className="mt-0.5 block text-[0.58rem] uppercase tracking-[1.5px]"
                style={{ color: "rgba(201,168,76,0.45)" }}
              >
                Staff Portal
              </span>
            </div>
          )}
        </div>

        <nav
          className="flex-1 overflow-y-auto py-2.5"
          style={{ scrollbarWidth: "none" }}
        >
          {!effectiveCollapsed && (
            <div
              className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
              style={{ color: "rgba(240,232,220,0.28)" }}
            >
              Order Status
            </div>
          )}

          {statusItems.map((item) => {
            const isActive = activeStatus === item.status;
            return (
              <button
                key={item.status}
                type="button"
                onClick={() => selectStatus(item.status)}
                title={item.label}
                className="relative flex w-full items-center gap-[11px] overflow-hidden whitespace-nowrap border-l-[3px] px-[18px] py-2.5 text-left text-[0.81rem] font-medium transition-all duration-[180ms]"
                style={{
                  borderLeftColor: isActive ? item.color : "transparent",
                  background: isActive ? `${item.color}22` : "transparent",
                  color: isActive ? item.color : "rgba(240,232,220,0.58)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(201,168,76,0.09)";
                    e.currentTarget.style.color = "#E8C96D";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(240,232,220,0.58)";
                  }
                }}
              >
                <span className="w-[22px] flex-shrink-0 text-center text-[1.05rem]">
                  {item.icon}
                </span>
                {!effectiveCollapsed && (
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                )}
                {item.count > 0 && (
                  <span
                    className={`rounded-full text-center text-[0.62rem] font-extrabold ${
                      effectiveCollapsed
                        ? "absolute right-1 top-1 min-w-[18px] px-1"
                        : "ml-auto min-w-[22px] px-[7px] py-[1px]"
                    }`}
                    style={{
                      background: isActive ? item.color : "#C9A84C",
                      color: "#1A0F2E",
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}

          {!effectiveCollapsed && (
            <div
              className="px-[18px] pt-3.5 pb-1 text-[0.6rem] font-bold uppercase tracking-[0.8px]"
              style={{ color: "rgba(240,232,220,0.28)" }}
            >
              Account
            </div>
          )}
          <button
            onClick={logout}
            className="flex w-full items-center gap-[11px] border-l-[3px] border-l-transparent px-[18px] py-2.5 text-[0.81rem] font-medium transition-all duration-[180ms]"
            style={{ color: "rgba(240,232,220,0.55)" }}
            title="Logout"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(201,168,76,0.09)";
              e.currentTarget.style.color = "#E8C96D";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(240,232,220,0.55)";
            }}
          >
            <span className="w-[22px] flex-shrink-0 text-center text-[1.1rem]">
              🚪
            </span>
            {!effectiveCollapsed && <span>Logout</span>}
          </button>
        </nav>

        <div
          className="flex items-center gap-2.5 overflow-hidden px-4 py-3.5"
          style={{ borderTop: "1px solid rgba(201,168,76,0.12)" }}
        >
          <img
            src={hiddenOvenLogo}
            alt={`${initials} staff logo`}
            className="h-8 w-8 flex-shrink-0 rounded-lg object-cover"
          />
          {!effectiveCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
              <div
                className="truncate text-[0.78rem] font-semibold"
                style={{ color: "#E8C96D" }}
              >
                {user?.email || "Staff"}
              </div>
              <div
                className="mt-0.5 text-[0.65rem]"
                style={{ color: "rgba(240,232,220,0.38)" }}
              >
                Staff Member
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          className="sticky top-0 z-40 flex h-[54px] flex-shrink-0 items-center gap-3 px-5"
          style={{
            background: "#1E1235",
            borderBottom: "1px solid rgba(201,168,76,0.18)",
          }}
        >
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
            aria-label="Open staff menu"
          >
            ☰
          </button>

          <span
            className="font-display flex-1 truncate text-[1.1rem] font-bold"
            style={{ color: "#E8C96D" }}
          >
            {activeLabel || "Order Queue"}
          </span>
          {orderCount > 0 && (
            <span
              className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold"
              style={{ background: "#C9A84C", color: "#1A0F2E" }}
            >
              {orderCount}
            </span>
          )}
          {dateStr && (
            <span
              className="hidden text-[0.73rem] whitespace-nowrap sm:block"
              style={{ color: "#9080A8" }}
            >
              {dateStr}
            </span>
          )}
        </div>

        <main className="flex-1 overflow-y-auto p-5 pb-16 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
