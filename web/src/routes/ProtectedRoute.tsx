import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";
type Props = {
    children: React.ReactNode;
};
export function ProtectedRoute({ children }: Props) {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading) {
        return <p>{t("common.loading")}</p>;
    }
    if (!user) {
        const returnTo = `${location.pathname}${location.search}`;
        return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
    }
    return children;
}
