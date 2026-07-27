import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/staff/orders", label: "Order Queue" },
];

export function StaffLayout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex bg-neutral-100">
      {/* Sidebar */}
      <aside className="w-56 bg-neutral-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-neutral-700">
          <p className="font-display text-lg font-bold text-brand-300">The Hidden Oven</p>
          <p className="text-xs text-neutral-400 mt-0.5">Staff Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-500 text-white" : "text-neutral-300 hover:bg-neutral-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-neutral-700">
          <p className="text-xs text-neutral-400 truncate mb-2">{user?.email}</p>
          <button onClick={logout} className="text-sm text-neutral-300 hover:text-white">
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
