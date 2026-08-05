import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

type Props = {
  children: React.ReactNode;
};

export function ProtectedRoute({
  children
}: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
}