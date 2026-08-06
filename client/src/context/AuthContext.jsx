import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(readStoredUser);
  const [authReady, setAuthReady] = useState(false);

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

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      if (!localStorage.getItem("token")) {
        if (active) setAuthReady(true);
        return;
      }

      try {
        const data = await api("/auth/me");
        if (!active) return;
        setUser(data);
      } catch (error) {
        if (!active) return;
        setToken(null);
        setUser(null);
      } finally {
        if (active) setAuthReady(true);
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener("appboutique:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("appboutique:auth-expired", handleAuthExpired);
  }, []);

  const login = async (email, password, totpCode) => {
    const response = await api("/auth/login", { method: "POST", body: { email, password, totpCode } });
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const requestGoogleCode = async (credential) => {
    return api("/auth/google/request-code", { method: "POST", body: { credential } });
  };

  const verifyGoogleCode = async (requestId, code) => {
    const response = await api("/auth/google/verify-code", { method: "POST", body: { requestId, code } });
    localStorage.setItem("token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
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
      value={{ token, user, authReady, login, logout, refreshUser, setUser, requestGoogleCode, verifyGoogleCode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
