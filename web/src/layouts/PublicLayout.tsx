import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { t } from "@/i18n";
export function PublicLayout() {
    const { user, loading } = useAuth();
    if (loading) {
        return <div>{t("common.loading")}</div>;
    }
    if (user) {
        return <Navigate to="/main" replace />;
    }
    return <Outlet />;
}
