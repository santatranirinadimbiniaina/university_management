import type {
  Affectation,
  AffectationPayload,
  Bulletin,
  Directeur,
  DirecteurPayload,
  Classe,
  ClassePayload,
  DemandeReleve,
  Etablissement,
  EtablissementPayload,
  Etudiant,
  EtudiantPayload,
  Matiere,
  MatierePayload,
  Note,
  NotePayload,
  Professeur,
  ProfesseurPayload,
  SuperAdmin,
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

export interface LoginResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  admin?: SuperAdmin;
  directeur?: Directeur;
  professeur?: Professeur;
  etudiant?: Etudiant;
}

export const api = {
  /* ------------------------------ Authentification ----------------------------- */
  loginSuperAdmin: (matricule: string, mot_de_passe: string) =>
    request<LoginResponse>("/super_admin/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  loginDirecteur: (matricule: string, mot_de_passe: string) =>
    request<LoginResponse>("/directeurs/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  loginProfesseur: (matricule: string, mot_de_passe: string) =>
    request<LoginResponse>("/professeurs/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  loginEtudiant: (matricule: string, mot_de_passe: string) =>
    request<LoginResponse>("/etudiants/login", {
      method: "POST",
      body: { matricule, mot_de_passe },
    }),

  refreshToken: (
    type: "super_admin" | "directeur" | "professeur" | "etudiant",
    refreshToken: string,
  ) => {
    const nsMap = {
      super_admin: "super_admin",
      directeur: "directeurs",
      professeur: "professeurs",
      etudiant: "etudiants",
    } as const;
    const ns = nsMap[type];
    return request<{ access_token: string }>(`/${ns}/refresh`, {
      method: "POST",
      token: refreshToken,
    });
  },

  /* ------------------------- Référentiel (super admin) ------------------------- */
  listDirecteurs: (token?: string) => request<Directeur[]>("/directeurs/", { token }),
  createDirecteur: (token: string, payload: DirecteurPayload) =>
    request<Directeur>("/directeurs/", { method: "POST", body: payload, token }),
  updateDirecteur: (token: string, id: number, payload: Partial<DirecteurPayload>) =>
    request<Directeur>(`/directeurs/${id}`, { method: "PUT", body: payload, token }),
  deleteDirecteur: (token: string, id: number) =>
    request<{ message: string }>(`/directeurs/${id}`, { method: "DELETE", token }),

  listEtablissements: (token?: string) =>
    request<Etablissement[]>("/etablissements/", { token }),
  createEtablissement: (token: string, payload: EtablissementPayload) =>
    request<Etablissement>("/etablissements/", { method: "POST", body: payload, token }),
  updateEtablissement: (token: string, id: number, payload: Partial<EtablissementPayload>) =>
    request<Etablissement>(`/etablissements/${id}`, { method: "PUT", body: payload, token }),
  deleteEtablissement: (token: string, id: number) =>
    request<{ message: string }>(`/etablissements/${id}`, { method: "DELETE", token }),

  listClasses: (token?: string) => request<Classe[]>("/classes/", { token }),
  createClasse: (token: string, payload: ClassePayload) =>
    request<Classe>("/classes/", { method: "POST", body: payload, token }),
  updateClasse: (token: string, id: number, payload: Partial<ClassePayload>) =>
    request<Classe>(`/classes/${id}`, { method: "PUT", body: payload, token }),
  deleteClasse: (token: string, id: number) =>
    request<{ message: string }>(`/classes/${id}`, { method: "DELETE", token }),

  listMatieres: (token?: string) => request<Matiere[]>("/matieres/", { token }),
  createMatiere: (token: string, payload: MatierePayload) =>
    request<Matiere>("/matieres/", { method: "POST", body: payload, token }),
  updateMatiere: (token: string, id: number, payload: Partial<MatierePayload>) =>
    request<Matiere>(`/matieres/${id}`, { method: "PUT", body: payload, token }),
  deleteMatiere: (token: string, id: number) =>
    request<{ message: string }>(`/matieres/${id}`, { method: "DELETE", token }),

  listProfesseurs: (token?: string) => request<Professeur[]>("/professeurs/", { token }),
  createProfesseur: (token: string, payload: ProfesseurPayload) =>
    request<Professeur>("/professeurs/", { method: "POST", body: payload, token }),
  updateProfesseur: (token: string, id: number, payload: Partial<ProfesseurPayload>) =>
    request<Professeur>(`/professeurs/${id}`, { method: "PUT", body: payload, token }),
  deleteProfesseur: (token: string, id: number) =>
    request<{ message: string }>(`/professeurs/${id}`, { method: "DELETE", token }),

  listAffectations: (token?: string) => request<Affectation[]>("/affectations/", { token }),
  createAffectation: (token: string, payload: AffectationPayload) =>
    request<Affectation>("/affectations/", { method: "POST", body: payload, token }),
  deleteAffectation: (token: string, id: number) =>
    request<{ message: string }>(`/affectations/${id}`, { method: "DELETE", token }),

  listEtudiants: (token?: string) => request<Etudiant[]>("/etudiants/", { token }),
  createEtudiant: (token: string, payload: EtudiantPayload) =>
    request<Etudiant>("/etudiants/", { method: "POST", body: payload, token }),
  updateEtudiant: (token: string, id: number, payload: Partial<EtudiantPayload>) =>
    request<Etudiant>(`/etudiants/${id}`, { method: "PUT", body: payload, token }),
  deleteEtudiant: (token: string, id: number) =>
    request<{ message: string }>(`/etudiants/${id}`, { method: "DELETE", token }),

  listSuperAdmins: (token: string) => request<SuperAdmin[]>("/super_admin/", { token }),

  /* --------------------------- Notes (professeur) ------------------------------ */
  createNote: (token: string, payload: NotePayload) =>
    request<Note>("/notes/", { method: "POST", body: payload, token }),
  updateNote: (token: string, id: number, payload: Partial<NotePayload>) =>
    request<Note>(`/notes/${id}`, { method: "PUT", body: payload, token }),
  deleteNote: (token: string, id: number) =>
    request<{ message: string }>(`/notes/${id}`, { method: "DELETE", token }),

  listNotes: (params: { id_etudiant?: number; id_matiere?: number; semestre?: string }, token?: string) => {
    const qs = new URLSearchParams();
    if (params.id_etudiant) qs.set("id_etudiant", String(params.id_etudiant));
    if (params.id_matiere) qs.set("id_matiere", String(params.id_matiere));
    if (params.semestre) qs.set("semestre", params.semestre);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return request<Note[]>(`/notes/${suffix}`, { token });
  },

  bulletin: (idEtudiant: number, semestre?: string, token?: string) =>
    request<Bulletin>(
      `/notes/bulletin/${idEtudiant}${semestre ? `?semestre=${semestre}` : ""}`,
      { token },
    ),

  /* ------------------------ Demandes de relevé de notes ------------------------ */
  listDemandesReleve: (token: string) =>
    request<DemandeReleve[]>("/demandes-releve/", { token }),
  createDemandeReleve: (token: string, motif: string) =>
    request<DemandeReleve>("/demandes-releve/", { method: "POST", body: { motif }, token }),
  traiterDemandeReleve: (token: string, id: number, statut: string) =>
    request<DemandeReleve>(`/demandes-releve/${id}/traiter`, {
      method: "PUT",
      body: { statut },
      token,
    }),
};
