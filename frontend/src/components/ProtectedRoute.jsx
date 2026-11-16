import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { LoadingState } from "./StateViews.jsx";

/**
 * Protege rotas no frontend (experiência do usuário).
 * A segurança real é garantida pelo backend, que valida o JWT e o perfil em cada requisição.
 */
export default function ProtectedRoute({ role }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingState message="Verificando sessão..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/cardapio"} replace />;
  return <Outlet />;
}
