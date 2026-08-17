import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";
export function FallbackRedirect() {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                {t("common.loading")}
            </div>
        );
    }
    return <Navigate to={user ? "/main" : "/"} replace />;
}
