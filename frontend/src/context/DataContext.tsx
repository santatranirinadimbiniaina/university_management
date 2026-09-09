import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "@/lib/api";
import { mockAdmins, mockUtilisateurs } from "@/lib/mock";
import type {
  AdminPayload,
  SuperAdmin,
  Utilisateur,
  UtilisateurPayload,
} from "@/lib/types";
import { useAuth } from "./AuthContext";

export type ApiStatus = "inconnu" | "connecte" | "demo" | "hors-ligne";

interface DataContextValue {
  utilisateurs: Utilisateur[];
  admins: SuperAdmin[];
  loading: boolean;
  error: string | null;
  apiStatus: ApiStatus;
  reload: () => Promise<void>;
  createUtilisateur: (payload: UtilisateurPayload) => Promise<void>;
  updateUtilisateur: (id: number, payload: Partial<UtilisateurPayload>) => Promise<void>;
  deleteUtilisateur: (id: number) => Promise<void>;
  createAdmin: (payload: AdminPayload) => Promise<void>;
  updateAdmin: (id: number, payload: AdminPayload) => Promise<void>;
  deleteAdmin: (id: number) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const pause = (ms = 420) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, refreshAccessToken } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("inconnu");

  /** Exécute un appel authentifié avec tentative de rafraîchissement sur 401. */
  const withAuth = useCallback(
    async <T,>(fn: (token: string) => Promise<T>): Promise<T> => {
      if (!session) throw new ApiError("Session expirée. Reconnectez-vous.", 401);
      try {
        return await fn(session.accessToken);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const fresh = await refreshAccessToken();
          if (!fresh) throw err;
          return await fn(fresh);
        }
        throw err;
      }
    },
    [session, refreshAccessToken],
  );

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setLoading(true);
      setError(null);

      if (session.demo) {
        await pause(560);
        setUtilisateurs(mockUtilisateurs);
        setAdmins(mockAdmins);
        setApiStatus("demo");
        setLoading(false);
        return;
      }

      try {
        const [u, a] = await Promise.all([
          withAuth((token) => api.listUtilisateurs(token)),
          session.type === "super_admin"
            ? withAuth((token) => api.listAdmins(token))
            : Promise.resolve([] as SuperAdmin[]),
        ]);
        setUtilisateurs(u);
        setAdmins(a);
        setApiStatus("connecte");
      } catch (err) {
        setApiStatus("hors-ligne");
        setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      } finally {
        setLoading(false);
      }
    },
    [session, withAuth],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  /* -------------------------------- Utilisateurs ------------------------------- */

  const createUtilisateur = useCallback(
    async (payload: UtilisateurPayload) => {
      if (session?.demo) {
        await pause();
        setUtilisateurs((prev) => [
          { ...payload, id: Math.max(0, ...prev.map((x) => x.id)) + 1, date_creation: new Date().toISOString() },
          ...prev,
        ]);
        return;
      }
      await withAuth((token) => api.createUtilisateur(token, payload));
      await load(true);
    },
    [session, withAuth, load],
  );

  const updateUtilisateur = useCallback(
    async (id: number, payload: Partial<UtilisateurPayload>) => {
      if (session?.demo) {
        await pause();
        setUtilisateurs((prev) =>
          prev.map((u) => {
            if (u.id !== id) return u;
            const { mot_de_passe: _omit, ...rest } = payload;
            return { ...u, ...rest };
          }),
        );
        return;
      }
      await withAuth((token) => api.updateUtilisateur(token, id, payload));
      await load(true);
    },
    [session, withAuth, load],
  );

  const deleteUtilisateur = useCallback(
    async (id: number) => {
      if (session?.demo) {
        await pause();
        setUtilisateurs((prev) => prev.filter((u) => u.id !== id));
        return;
      }
      await withAuth((token) => api.deleteUtilisateur(token, id));
      await load(true);
    },
    [session, withAuth, load],
  );

  /* ------------------------------- Super admins -------------------------------- */

  const createAdmin = useCallback(
    async (payload: AdminPayload) => {
      if (session?.demo) {
        await pause();
        setAdmins((prev) => [
          { id: Math.max(0, ...prev.map((x) => x.id)) + 1, matricule: payload.matricule, date_creation: new Date().toISOString() },
          ...prev,
        ]);
        return;
      }
      await withAuth((token) => api.createAdmin(token, payload));
      await load(true);
    },
    [session, withAuth, load],
  );

  const updateAdmin = useCallback(
    async (id: number, payload: AdminPayload) => {
      if (session?.demo) {
        await pause();
        setAdmins((prev) =>
          prev.map((a) => (a.id === id ? { ...a, matricule: payload.matricule } : a)),
        );
        return;
      }
      await withAuth((token) => api.updateAdmin(token, id, payload));
      await load(true);
    },
    [session, withAuth, load],
  );

  const deleteAdmin = useCallback(
    async (id: number) => {
      if (session?.demo) {
        await pause();
        setAdmins((prev) => prev.filter((a) => a.id !== id));
        return;
      }
      await withAuth((token) => api.deleteAdmin(token, id));
      await load(true);
    },
    [session, withAuth, load],
  );

  const value = useMemo(
    () => ({
      utilisateurs,
      admins,
      loading,
      error,
      apiStatus,
      reload,
      createUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      createAdmin,
      updateAdmin,
      deleteAdmin,
    }),
    [
      utilisateurs,
      admins,
      loading,
      error,
      apiStatus,
      reload,
      createUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      createAdmin,
      updateAdmin,
      deleteAdmin,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData doit être utilisé dans DataProvider");
  return ctx;
}
