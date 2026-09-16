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
import {
  mockAffectations,
  mockDirecteurs,
  mockClasses,
  mockDemandes,
  mockEtablissements,
  mockEtudiants,
  mockMatieres,
  mockNotes,
  mockProfesseurs,
} from "@/lib/mock";
import type {
  Affectation,
  AffectationPayload,
  Classe,
  ClassePayload,
  DemandeReleve,
  Directeur,
  DirecteurPayload,
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
} from "@/lib/types";
import { useAuth } from "./AuthContext";

export type ApiStatus = "inconnu" | "connecte" | "demo" | "hors-ligne";

interface DataContextValue {
  etablissements: Etablissement[];
  directeurs: Directeur[];
  classes: Classe[];
  matieres: Matiere[];
  professeurs: Professeur[];
  affectations: Affectation[];
  etudiants: Etudiant[];
  notes: Note[];
  demandesReleve: DemandeReleve[];
  loading: boolean;
  error: string | null;
  apiStatus: ApiStatus;
  reload: () => Promise<void>;
  createEtablissement: (payload: EtablissementPayload) => Promise<void>;
  updateEtablissement: (id: number, payload: Partial<EtablissementPayload>) => Promise<void>;
  deleteEtablissement: (id: number) => Promise<void>;
  createDirecteur: (payload: DirecteurPayload) => Promise<void>;
  updateDirecteur: (id: number, payload: Partial<DirecteurPayload>) => Promise<void>;
  deleteDirecteur: (id: number) => Promise<void>;
  createClasse: (payload: ClassePayload) => Promise<void>;
  updateClasse: (id: number, payload: Partial<ClassePayload>) => Promise<void>;
  deleteClasse: (id: number) => Promise<void>;
  createMatiere: (payload: MatierePayload) => Promise<void>;
  updateMatiere: (id: number, payload: Partial<MatierePayload>) => Promise<void>;
  deleteMatiere: (id: number) => Promise<void>;
  createProfesseur: (payload: ProfesseurPayload) => Promise<void>;
  updateProfesseur: (id: number, payload: Partial<ProfesseurPayload>) => Promise<void>;
  deleteProfesseur: (id: number) => Promise<void>;
  createAffectation: (payload: AffectationPayload) => Promise<void>;
  deleteAffectation: (id: number) => Promise<void>;
  createEtudiant: (payload: EtudiantPayload) => Promise<void>;
  updateEtudiant: (id: number, payload: Partial<EtudiantPayload>) => Promise<void>;
  deleteEtudiant: (id: number) => Promise<void>;
  createNote: (payload: NotePayload) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  createDemandeReleve: (motif: string) => Promise<void>;
  traiterDemandeReleve: (id: number, statut: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const pause = (ms = 420) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function DataProvider({ children }: { children: ReactNode }) {
  const { session, refreshAccessToken } = useAuth();
  const [etablissements, setEtablissements] = useState<Etablissement[]>([]);
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [demandesReleve, setDemandesReleve] = useState<DemandeReleve[]>([]);
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
        setEtablissements(mockEtablissements);
        setDirecteurs(mockDirecteurs);
        setClasses(mockClasses);
        setMatieres(mockMatieres);
        setProfesseurs(mockProfesseurs);
        setAffectations(mockAffectations);
        setEtudiants(mockEtudiants);
        setNotes(mockNotes);
        setDemandesReleve(mockDemandes);
        setApiStatus("demo");
        setLoading(false);
        return;
      }

      try {
        const isAdmin = session.type === "super_admin";
        const [ets, dirs, cls, mats, profs, affs, etus, notesData, demandes] = await Promise.all([
          api.listEtablissements(),
          api.listDirecteurs(),
          api.listClasses(),
          api.listMatieres(),
          api.listProfesseurs(),
          api.listAffectations(),
          api.listEtudiants(),
          api.listNotes({}),
          isAdmin ? withAuth((t) => api.listDemandesReleve(t)) : Promise.resolve([] as DemandeReleve[]),
        ]);
        setEtablissements(ets);
        setDirecteurs(dirs);
        setClasses(cls);
        setMatieres(mats);
        setProfesseurs(profs);
        setAffectations(affs);
        setEtudiants(etus);
        setNotes(notesData);
        setDemandesReleve(demandes);
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

  const mutate = useCallback(
    async (fn: (token: string) => Promise<unknown>) => {
      if (session?.demo) {
        await pause();
        return;
      }
      await withAuth(fn);
      await load(true);
    },
    [session, withAuth, load],
  );

  /* --------------------------- Référentiel scolaire --------------------------- */

  const createDirecteur = useCallback(
    (payload: DirecteurPayload) => mutate((t) => api.createDirecteur(t, payload)),
    [mutate],
  );
  const updateDirecteur = useCallback(
    (id: number, payload: Partial<DirecteurPayload>) =>
      mutate((t) => api.updateDirecteur(t, id, payload)),
    [mutate],
  );
  const deleteDirecteur = useCallback(
    (id: number) => mutate((t) => api.deleteDirecteur(t, id)),
    [mutate],
  );

  const createEtablissement = useCallback(
    (payload: EtablissementPayload) =>
      mutate((t) => api.createEtablissement(t, payload)),
    [mutate],
  );
  const updateEtablissement = useCallback(
    (id: number, payload: Partial<EtablissementPayload>) =>
      mutate((t) => api.updateEtablissement(t, id, payload)),
    [mutate],
  );
  const deleteEtablissement = useCallback(
    (id: number) => mutate((t) => api.deleteEtablissement(t, id)),
    [mutate],
  );

  const createClasse = useCallback(
    (payload: ClassePayload) => mutate((t) => api.createClasse(t, payload)),
    [mutate],
  );
  const updateClasse = useCallback(
    (id: number, payload: Partial<ClassePayload>) =>
      mutate((t) => api.updateClasse(t, id, payload)),
    [mutate],
  );
  const deleteClasse = useCallback(
    (id: number) => mutate((t) => api.deleteClasse(t, id)),
    [mutate],
  );

  const createMatiere = useCallback(
    (payload: MatierePayload) => mutate((t) => api.createMatiere(t, payload)),
    [mutate],
  );
  const updateMatiere = useCallback(
    (id: number, payload: Partial<MatierePayload>) =>
      mutate((t) => api.updateMatiere(t, id, payload)),
    [mutate],
  );
  const deleteMatiere = useCallback(
    (id: number) => mutate((t) => api.deleteMatiere(t, id)),
    [mutate],
  );

  const createProfesseur = useCallback(
    (payload: ProfesseurPayload) => mutate((t) => api.createProfesseur(t, payload)),
    [mutate],
  );
  const updateProfesseur = useCallback(
    (id: number, payload: Partial<ProfesseurPayload>) =>
      mutate((t) => api.updateProfesseur(t, id, payload)),
    [mutate],
  );
  const deleteProfesseur = useCallback(
    (id: number) => mutate((t) => api.deleteProfesseur(t, id)),
    [mutate],
  );

  const createAffectation = useCallback(
    (payload: AffectationPayload) => mutate((t) => api.createAffectation(t, payload)),
    [mutate],
  );
  const deleteAffectation = useCallback(
    (id: number) => mutate((t) => api.deleteAffectation(t, id)),
    [mutate],
  );

  const createEtudiant = useCallback(
    (payload: EtudiantPayload) => mutate((t) => api.createEtudiant(t, payload)),
    [mutate],
  );
  const updateEtudiant = useCallback(
    (id: number, payload: Partial<EtudiantPayload>) =>
      mutate((t) => api.updateEtudiant(t, id, payload)),
    [mutate],
  );
  const deleteEtudiant = useCallback(
    (id: number) => mutate((t) => api.deleteEtudiant(t, id)),
    [mutate],
  );

  /* --------------------------------- Notes ----------------------------------- */

  const createNote = useCallback(
    (payload: NotePayload) => mutate((t) => api.createNote(t, payload)),
    [mutate],
  );
  const deleteNote = useCallback(
    (id: number) => mutate((t) => api.deleteNote(t, id)),
    [mutate],
  );

  /* --------------------------- Demandes de relevé ------------------------------ */

  const createDemandeReleve = useCallback(
    (motif: string) => mutate((t) => api.createDemandeReleve(t, motif)),
    [mutate],
  );
  const traiterDemandeReleve = useCallback(
    (id: number, statut: string) => mutate((t) => api.traiterDemandeReleve(t, id, statut)),
    [mutate],
  );

  const value = useMemo(
    () => ({
      etablissements,
      directeurs,
      classes,
      matieres,
      professeurs,
      affectations,
      etudiants,
      notes,
      demandesReleve,
      loading,
      error,
      apiStatus,
      reload,
      createEtablissement,
      updateEtablissement,
      deleteEtablissement,
      createDirecteur,
      updateDirecteur,
      deleteDirecteur,
      createClasse,
      updateClasse,
      deleteClasse,
      createMatiere,
      updateMatiere,
      deleteMatiere,
      createProfesseur,
      updateProfesseur,
      deleteProfesseur,
      createAffectation,
      deleteAffectation,
      createEtudiant,
      updateEtudiant,
      deleteEtudiant,
      createNote,
      deleteNote,
      createDemandeReleve,
      traiterDemandeReleve,
    }),
    [
      etablissements, directeurs, classes, matieres, professeurs, affectations, etudiants,
      notes, demandesReleve, loading, error, apiStatus, reload,
      createEtablissement, updateEtablissement, deleteEtablissement,
      createDirecteur, updateDirecteur, deleteDirecteur,
      createClasse, updateClasse, deleteClasse,
      createMatiere, updateMatiere, deleteMatiere,
      createProfesseur, updateProfesseur, deleteProfesseur,
      createAffectation, deleteAffectation,
      createEtudiant, updateEtudiant, deleteEtudiant,
      createNote, deleteNote,
      createDemandeReleve, traiterDemandeReleve,
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
