import { Navigate, Outlet } from "react-router-dom";
import { PageSkeleton } from "@/components/async/PageSkeleton";
import { useOpsSession } from "./hooks";

export function OpsGuard() {
    const session = useOpsSession();
    if (session.isLoading) return <PageSkeleton />;
    if (!session.data) return <Navigate to="/forbidden" replace />;
    return <Outlet />;
}
