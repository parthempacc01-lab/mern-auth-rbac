import { useCallback, useEffect, useMemo, useState } from "react";
import { accountApi } from "../api/accountApi";
import { authApi } from "../api/authApi";
import { refreshAccessToken, tokenStorage } from "../api/client";
import { AuthContext } from "./authContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const loadProfile = useCallback(async () => {
    const data = await accountApi.getProfile();
    setUser(data.user);
    return data.user;
  }, []);

  const restoreSession = useCallback(async () => {
    setStatus("loading");
    try {
      await refreshAccessToken();
      await loadProfile();
      setStatus("authenticated");
    } catch {
      tokenStorage.clear();
      setUser(null);
      setStatus("unauthenticated");
    }
  }, [loadProfile]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      restoreSession();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [restoreSession]);

  const login = useCallback(async (credentials) => {
    await authApi.login(credentials);
    await loadProfile();
    setStatus("authenticated");
  }, [loadProfile]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(() => ({
    user,
    role: user?.role ?? null,
    status,
    isAuthenticated: status === "authenticated",
    login,
    logout,
    refreshProfile: loadProfile,
  }), [user, status, login, logout, loadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
