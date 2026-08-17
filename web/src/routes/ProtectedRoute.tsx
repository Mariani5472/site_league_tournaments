import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { t } from "@/i18n";
type Props = {
    children: React.ReactNode;
};
export function ProtectedRoute({ children }: Props) {
    const { user, loading } = useAuth();
    if (loading) {
        return <p>{t("common.loading")}</p>;
    }
    if (!user) {
        return <Navigate to="/login"/>;
    }
    return children;
}
