import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
export function PublicLayout() {
    const { user, loading, } = useAuth();
    if (loading) {
        return (<div>
        Loading...
      </div>);
    }
    if (user) {
        return (<Navigate to="/main" replace/>);
    }
    return <Outlet />;
}
