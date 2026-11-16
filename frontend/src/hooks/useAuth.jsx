import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tokenStorage } from "../services/api.js";
import { authService } from "../services/index.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" enquanto recupera a sessão salva; evita redirecionar antes da hora.
  const [status, setStatus] = useState(() => (tokenStorage.get() ? "loading" : "ready"));

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // Recuperação de sessão: valida o token salvo no backend.
  useEffect(() => {
    if (!tokenStorage.get()) return;
    authService
      .me()
      .then(({ user }) => setUser(user))
      .catch(clearSession)
      .finally(() => setStatus("ready"));
  }, [clearSession]);

  // Token expirado durante o uso → encerra a sessão.
  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener("estulanches:unauthorized", onUnauthorized);
    return () => window.removeEventListener("estulanches:unauthorized", onUnauthorized);
  }, [clearSession]);

  const startSession = useCallback(({ user, token }) => {
    tokenStorage.set(token);
    setUser(user);
    return user;
  }, []);

  const login = useCallback(async (credentials) => startSession(await authService.login(credentials)), [startSession]);
  const register = useCallback(async (payload) => startSession(await authService.register(payload)), [startSession]);

  const logout = useCallback(async () => {
    await authService.logout();
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "ADMIN",
      isLoading: status === "loading",
      login,
      register,
      logout,
    }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
