import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Outlet, Navigate }
  from "react-router-dom";

export function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
        "
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <div
      className="
        flex
        min-h-screen
        bg-background
      "
    >
      <aside
        className="
          w-64
          border-r
          bg-card
          p-4
        "
      >
        <Sidebar />
      </aside>

      <div className="flex-1">
        <header
          className="
            border-b
            p-4
          "
        >
          Header
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}