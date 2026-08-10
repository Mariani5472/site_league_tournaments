import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
export function FallbackRedirect() {
    const { user, loading } = useAuth();
    if (loading) {
        return (<div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>);
    }
    return (<Navigate to={user ? "/main" : "/"} replace/>);
}
