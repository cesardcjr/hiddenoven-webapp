import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../ui/Spinner";

export function ProtectedRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={requiredRole === "admin" ? "/admin/login" : "/staff/login"} replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;

  return children;
}
