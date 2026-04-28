import { NavLink } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";

const NAV: Record<string, Array<{ to: string; label: string }>> = {
  carrier: [
    { to: "/loadboard", label: "Loadboard" },
    { to: "/carrier/my-loads", label: "My Loads" },
    { to: "/carrier/dispatch", label: "Dispatch" },
    { to: "/carrier/drivers", label: "Drivers" },
    { to: "/carrier/trucks", label: "Trucks" },
    { to: "/carrier/compliance", label: "Compliance" },
    { to: "/carrier/settlements", label: "Settlements" },
  ],
  shipper: [
    { to: "/shipper/dashboard", label: "Dashboard" },
    { to: "/shipper/loads/new", label: "Post Load" },
    { to: "/shipper/loads", label: "Shipments" },
    { to: "/shipper/lanes", label: "Dedicated Lanes" },
    { to: "/shipper/invoices", label: "Invoices" },
  ],
  agent: [
    { to: "/agent/dashboard", label: "Dashboard" },
    { to: "/agent/loads", label: "My Loads" },
    { to: "/agent/post-load", label: "Post Load" },
    { to: "/agent/shippers", label: "My Shippers" },
    { to: "/agent/commissions", label: "Commissions" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Overview" },
    { to: "/admin/loads", label: "Loads" },
    { to: "/admin/carriers", label: "Carriers" },
    { to: "/admin/shippers", label: "Shippers" },
    { to: "/admin/agents", label: "Agents" },
    { to: "/admin/invoices", label: "Invoices" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/push", label: "Push" },
  ],
};

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);
  const items = role ? NAV[role] ?? [] : [];

  return (
    <aside className="hidden w-56 shrink-0 border-r border-white/[0.07] bg-deep md:block">
      <nav className="flex flex-col gap-1 p-4 text-sm">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `rounded-btn px-3 py-2 font-body transition ${
                isActive ? "bg-accent/12 text-accent font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
