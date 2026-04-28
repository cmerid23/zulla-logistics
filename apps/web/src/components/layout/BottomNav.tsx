import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";

const TABS: Record<string, Array<{ to: string; label: string; icon: string }>> = {
  carrier: [
    { to: "/loadboard", label: "Loads", icon: "📦" },
    { to: "/carrier/my-loads", label: "Mine", icon: "🚚" },
  ],
  shipper: [
    { to: "/shipper/dashboard", label: "Home", icon: "🏠" },
    { to: "/shipper/loads/new", label: "Post", icon: "➕" },
    { to: "/shipper/invoices", label: "Bills", icon: "🧾" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Stats", icon: "📊" },
    { to: "/admin/loads", label: "Loads", icon: "📦" },
    { to: "/admin/carriers", label: "Carriers", icon: "🚚" },
  ],
  agent: [
    { to: "/agent/dashboard", label: "Home", icon: "🏠" },
    { to: "/agent/loads", label: "Loads", icon: "📦" },
    { to: "/agent/commissions", label: "Comm", icon: "💰" },
  ],
};

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role);
  const tabs = role ? TABS[role] ?? [] : [];
  if (!tabs.length) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-black/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-3 text-xs">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-2 mono uppercase tracking-wider text-[10px] ${
                isActive ? "text-accent" : "text-muted"
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
