export type AccountType = "super_admin" | "directeur" | "professeur" | "etudiant";

export interface SuperAdmin {
  id: number;
  matricule: string;
  date_creation?: string;
}

export interface Directeur {
  id_directeur: number;
  matricule: string;
  nom: string;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  id_etablissement: number;
  date_creation?: string;
}

export interface Etablissement {
  id_etablissement: number;
  nom: string;
  adresse?: string | null;
  telephone?: string | null;
  email?: string | null;
  date_creation?: string;
}

export interface Classe {
  id_classe: number;
  nom_classe: string;
  niveau?: string | null;
  id_etablissement: number;
}

export interface Matiere {
  id_matiere: number;
  nom_matiere: string;
  coefficient: number;
  id_classe: number;
}

export interface Professeur {
  id_professeur: number;
  matricule: string;
  nom: string;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  date_creation?: string;
}

export interface Affectation {
  id_affectation: number;
  id_professeur: number;
  id_classe: number;
  id_matiere: number;
}

export interface Etudiant {
  id_etudiant: number;
  matricule: string;
  nom: string;
  prenom?: string | null;
  date_naissance?: string | null;
  email?: string | null;
  id_classe: number;
  date_creation?: string;
}

export interface Note {
  id_note: number;
  note: number;
  type_evaluation: string;
  semestre: string;
  id_etudiant: number;
  id_matiere: number;
  id_professeur: number;
  date_saisie?: string;
}

export interface DemandeReleve {
  id_demande: number;
  motif?: string | null;
  statut: "en_attente" | "traitee" | "refusee";
  date_demande?: string;
  date_traitement?: string | null;
  id_etudiant: number;
}

export interface LigneBulletin {
  matiere: string;
  coefficient: number;
  notes: number[];
  moyenne: number | null;
}

export interface Bulletin {
  etudiant: Etudiant;
  classe: Classe;
  semestre?: string | null;
  lignes: LigneBulletin[];
  moyenne_generale: number | null;
}

/* --------------------------------- Payloads -------------------------------- */

export interface DirecteurPayload {
  matricule: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  id_etablissement: number;
  mot_de_passe?: string;
}

export interface EtablissementPayload {
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
}

export interface ClassePayload {
  nom_classe: string;
  niveau?: string;
  id_etablissement: number;
}

export interface MatierePayload {
  nom_matiere: string;
  coefficient: number;
  id_classe: number;
}

export interface ProfesseurPayload {
  matricule: string;
  nom: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  mot_de_passe?: string;
}

export interface AffectationPayload {
  id_professeur: number;
  id_classe: number;
  id_matiere: number;
}

export interface EtudiantPayload {
  matricule: string;
  nom: string;
  prenom?: string;
  date_naissance?: string;
  email?: string;
  id_classe: number;
  mot_de_passe?: string;
}

export interface NotePayload {
  note: number;
  type_evaluation?: string;
  semestre?: string;
  id_etudiant: number;
  id_matiere: number;
}

/* --------------------------------- Session --------------------------------- */

export interface SessionProfile {
  id: number;
  matricule: string;
  nom?: string | null;
  prenom?: string | null;
  role: string;
  /** L'étudiant connaît sa classe ; le professeur ses affectations. */
  id_classe?: number | null;
  /** Le directeur est rattaché à son établissement. */
  id_etablissement?: number | null;
}

export interface Session {
  type: AccountType;
  accessToken: string;
  refreshToken: string;
  profile: SessionProfile;
  demo: boolean;
}
