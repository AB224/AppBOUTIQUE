import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const login = async (email, password, totpCode) => {
    const response = await api("/auth/login", { method: "POST", body: { email, password, totpCode } });
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const requestGoogleCode = async (credential) => {
    return api("/auth/google/request-code", { method: "POST", body: { credential } });
  };

  const verifyGoogleCode = async (requestId, code) => {
    const response = await api("/auth/google/verify-code", { method: "POST", body: { requestId, code } });
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const refreshUser = async () => {
    if (!localStorage.getItem("token")) return null;
    const data = await api("/auth/me");
    setUser(data);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, refreshUser, setUser, requestGoogleCode, verifyGoogleCode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
