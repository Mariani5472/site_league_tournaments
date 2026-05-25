import {
  NavLink
} from "react-router-dom";

const links = [
  {
    to: "/dashboard",
    label: "Dashboard"
  },
  {
    to: "/leagues",
    label: "My Leagues"
  },
  {
    to: "/leagues/public",
    label: "Public Leagues"
  },
  {
    to: "/profile",
    label: "Profile"
  }
];

export function Sidebar() {
  return (
    <aside
      className="
        flex
        h-screen
        w-64
        flex-col
        border-r
        bg-card
      "
    >
      <div
        className="
          border-b
          p-6
        "
      >
        <h1
          className="
            text-xl
            font-bold
          "
        >
          League App
        </h1>
      </div>

      <nav
        className="
          flex
          flex-1
          flex-col
          gap-2
          p-4
        "
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `
                rounded-md
                px-4
                py-2
                text-sm
                transition-colors
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }
              `
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}