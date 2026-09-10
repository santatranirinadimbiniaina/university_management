import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { AccountType, Session } from "@/lib/types";

const STORAGE_KEY = "GERUNIV.session";

interface AuthContextValue {
  session: Session | null;
  initializing: boolean;
  login: (type: AccountType, matricule: string, motDePasse: string) => Promise<void>;
  loginDemo: () => void;
  logout: () => void;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    setSession(readStoredSession());
    setInitializing(false);
  }, []);

  const persist = useCallback((value: Session | null) => {
    setSession(value);
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (type: AccountType, matricule: string, motDePasse: string) => {
      if (type === "super_admin") {
        const res = await api.loginSuperAdmin(matricule, motDePasse);
        persist({
          type,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          profile: { id: res.admin.id, matricule: res.admin.matricule, role: "super_admin" },
          demo: false,
        });
      } else {
        const res = await api.loginUtilisateur(matricule, motDePasse);
        persist({
          type,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
          profile: {
            id: res.user.id,
            matricule: res.user.matricule,
            nom: res.user.nom,
            role: res.user.role,
            classe: res.user.classe,
            permission: res.user.permission,
          },
          demo: false,
        });
      }
    },
    [persist],
  );

  const loginDemo = useCallback(() => {
    persist({
      type: "super_admin",
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      profile: { id: 1, matricule: "SA-0001", nom: "Admin Démo", role: "super_admin" },
      demo: true,
    });
  }, [persist]);

  const logout = useCallback(() => persist(null), [persist]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null;
    if (session.demo) return session.accessToken;
    try {
      const res = await api.refreshToken(session.type, session.refreshToken);
      persist({ ...session, accessToken: res.access_token });
      return res.access_token;
    } catch {
      persist(null);
      return null;
    }
  }, [session, persist]);

  const value = useMemo(
    () => ({ session, initializing, login, loginDemo, logout, refreshAccessToken }),
    [session, initializing, login, loginDemo, logout, refreshAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}
