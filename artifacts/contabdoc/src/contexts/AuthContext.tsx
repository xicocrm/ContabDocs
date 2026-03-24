import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { API } from "@/lib/api";

interface AuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  isSetupNeeded: boolean;
  login: (email: string, senha: string, lembrar?: boolean) => Promise<void>;
  logout: () => void;
  checkSetup: () => Promise<boolean>;
}

const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  isSetupNeeded: false,
  login: async () => {},
  logout: () => {},
  checkSetup: async () => false,
});

function getToken(): string | null {
  return localStorage.getItem("contabdoc_token") || sessionStorage.getItem("contabdoc_token");
}

function saveToken(token: string, lembrar: boolean) {
  if (lembrar) {
    localStorage.setItem("contabdoc_token", token);
    sessionStorage.removeItem("contabdoc_token");
  } else {
    sessionStorage.setItem("contabdoc_token", token);
    localStorage.removeItem("contabdoc_token");
  }
}

function clearToken() {
  localStorage.removeItem("contabdoc_token");
  sessionStorage.removeItem("contabdoc_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  const checkSetup = useCallback(async () => {
    try {
      const data = await API.get<{ needsSetup: boolean }>("/auth/check-setup");
      setIsSetupNeeded(data.needsSetup);
      return data.needsSetup;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    API.get<AuthUser>("/auth/me")
      .then(u => { setUser(u); })
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, senha: string, lembrar = true) => {
    const data = await API.post<{ token: string; user: AuthUser }>("/auth/login", { email, senha });
    saveToken(data.token, lembrar);
    if (lembrar) {
      localStorage.setItem("contabdoc_saved_email", email.toLowerCase().trim());
    } else {
      localStorage.removeItem("contabdoc_saved_email");
    }
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    window.location.href = base + "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isSetupNeeded, login, logout, checkSetup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
