import type {
  AccountType,
  AdminPayload,
  SuperAdmin,
  Utilisateur,
  UtilisateurPayload,
} from "./types";

/**
 * URL de l'API Flask.
 * Surchargeable via la variable d'environnement VITE_API_URL (fichier .env).
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      "API injoignable. Vérifiez que le serveur Flask est démarré (CORS activé) puis réessayez.",
      0,
    );
  }

  let data: Record<string, unknown> = {};
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const message =
      typeof data.message === "string" && data.message.length > 0
        ? data.message
        : `Erreur ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export interface SuperAdminLoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  admin: { id: number; matricule: string };
}

export interface UtilisateurLoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    nom: string;
    role: string;
    classe: string;
    permission: string;
    matricule: string;
  };
}

const ns = (type: AccountType) => (type === "super_admin" ? "super_admin" : "utilisateurs");

export const api = {
  /* ------------------------------ Authentification ----------------------------- */
  loginSuperAdmin: (matricule: string, mot_de_passe: string) =>
    request<SuperAdminLoginResponse>("/super_admin/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  loginUtilisateur: (matricule: string, mot_de_passe: string) =>
    request<UtilisateurLoginResponse>("/utilisateurs/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  refreshToken: (type: AccountType, refreshToken: string) =>
    request<{ access_token: string }>(`/${ns(type)}/refresh`, {
      method: "POST",
      token: refreshToken,
    }),

  /* ------------------------------- Super admins -------------------------------- */
  listAdmins: (token: string) => request<SuperAdmin[]>("/super_admin/", { token }),

  createAdmin: (token: string, payload: AdminPayload) =>
    request<SuperAdmin>("/super_admin/creer_admin", {
      method: "POST",
      body: payload,
      token,
    }),

  updateAdmin: (token: string, id: number, payload: AdminPayload) =>
    request<SuperAdmin>(`/super_admin/${id}`, { method: "PUT", body: payload, token }),

  deleteAdmin: (token: string, id: number) =>
    request<{ message: string }>(`/super_admin/delete/${id}`, { method: "DELETE", token }),

  /* -------------------------------- Utilisateurs ------------------------------- */
  listUtilisateurs: (token: string) => request<Utilisateur[]>("/utilisateurs/", { token }),

  createUtilisateur: (token: string, payload: UtilisateurPayload) =>
    request<Utilisateur>("/utilisateurs/creer_utilisateur", {
      method: "POST",
      body: payload,
      token,
    }),

  updateUtilisateur: (token: string, id: number, payload: Partial<UtilisateurPayload>) =>
    request<Utilisateur>(`/utilisateurs/${id}`, { method: "PUT", body: payload, token }),

  deleteUtilisateur: (token: string, id: number) =>
    request<{ message: string }>(`/utilisateurs/delete/${id}`, { method: "DELETE", token }),
};
