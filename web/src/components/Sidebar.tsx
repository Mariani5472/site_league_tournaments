import { NavLink } from "react-router-dom";

const links = [
  { to: "/main", label: "Dashboard" },
  { to: "/leagues", label: "Leagues" },
  { to: "/profile", label: "Profile" }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative lg:flex lg:h-full lg:z-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="flex h-16 shrink-0 items-center justify-end px-6">
        <button
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted lg:hidden"
          aria-label="Fechar menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onClose} 
            className={({ isActive }) =>
              `flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-all
              ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}