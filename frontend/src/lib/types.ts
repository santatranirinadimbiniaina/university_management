export type AccountType = "super_admin" | "utilisateur";

export interface SuperAdmin {
  id: number;
  matricule: string;
  mot_de_passe?: string;
  date_creation?: string;
}

export interface Utilisateur {
  id: number;
  matricule: string;
  nom: string;
  role: string;
  classe: string;
  permission: string;
  mot_de_passe?: string;
  date_creation?: string;
}

export interface UtilisateurPayload {
  matricule: string;
  nom: string;
  role: string;
  classe: string;
  permission: string;
  mot_de_passe?: string;
}

export interface AdminPayload {
  matricule: string;
  mot_de_passe?: string;
}

export interface SessionProfile {
  id: number;
  matricule: string;
  nom?: string | null;
  role?: string | null;
  classe?: string | null;
  permission?: string | null;
}

export interface Session {
  type: AccountType;
  accessToken: string;
  refreshToken: string;
  profile: SessionProfile;
  demo: boolean;
}
