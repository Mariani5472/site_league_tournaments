import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, MailCheck, Search, Trophy, UserRound } from "lucide-react";
import { t } from "@/i18n";
const links = [
    { to: "/main", label: t("sidebar.dashboard"), icon: LayoutDashboard },
    { to: "/leagues", label: t("sidebar.leagues"), icon: Trophy },
    { to: "/players", label: t("sidebar.players"), icon: Search },
    { to: "/invitations", label: t("sidebar.invitations"), icon: MailCheck },
    { to: "/profile", label: t("sidebar.profile"), icon: UserRound },
];
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}
export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (isOpen) closeButtonRef.current?.focus();
    }, [isOpen]);
    return (
        <aside
            id="application-sidebar"
            aria-label={t("sidebar.navigation")}
            className={`
        fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:relative lg:flex lg:h-full lg:z-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        >
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
                <NavLink to="/main" className="flex items-center gap-2 font-bold tracking-tight">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                        L
                    </span>
                    <span>ligas</span>
                </NavLink>
                <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="rounded-md p-1 hover:bg-muted lg:hidden"
                    aria-label={t("sidebar.close")}
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                {links.map(link => {
                    const Icon = link.icon;
                    return (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            onClick={onClose}
                            className={({
                                isActive,
                            }) => `flex items-center rounded-md px-4 py-2.5 text-sm font-medium transition-all
              ${
                  isActive
                      ? "border-l-4 border-sidebar-primary bg-sidebar-accent pl-3 text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
                        >
                            <Icon className="mr-3 h-4 w-4" />
                            {link.label}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}
