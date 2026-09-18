import type {
  Affectation,
  Classe,
  Directeur,
  DemandeReleve,
  Etablissement,
  Etudiant,
  Matiere,
  Note,
  Professeur,
  Reclamation,
} from "./types";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/** Jeu de données hors-ligne pour explorer l'interface sans serveur Flask. */
export const mockEtablissements: Etablissement[] = [
  { id_etablissement: 1, nom: "Lycée Démo", adresse: "Avenue Centrale", telephone: "+221 33 000 00 00", date_creation: daysAgo(300) },
];

export const mockDirecteurs: Directeur[] = [
  { id_directeur: 1, matricule: "DIR-001", nom: "Dia", prenom: "Aminata", id_etablissement: 1, date_creation: daysAgo(299) },
];

export const mockClasses: Classe[] = [
  { id_classe: 1, nom_classe: "2nde A", niveau: "2nde", id_etablissement: 1 },
  { id_classe: 2, nom_classe: "1ère S", niveau: "1ère", id_etablissement: 1 },
];

export const mockMatieres: Matiere[] = [
  { id_matiere: 1, nom_matiere: "Mathématiques", coefficient: 4, id_classe: 1 },
  { id_matiere: 2, nom_matiere: "Histoire", coefficient: 2, id_classe: 1 },
  { id_matiere: 3, nom_matiere: "Mathématiques", coefficient: 5, id_classe: 2 },
];

export const mockProfesseurs: Professeur[] = [
  { id_professeur: 1, matricule: "PROF-001", nom: "Dupont", prenom: "Jean", email: "j.dupont@demo.sn", date_creation: daysAgo(120) },
  { id_professeur: 2, matricule: "PROF-002", nom: "Sow", prenom: "Fatou", email: "f.sow@demo.sn", date_creation: daysAgo(90) },
];

export const mockAffectations: Affectation[] = [
  { id_affectation: 1, id_professeur: 1, id_classe: 1, id_matiere: 1 },
  { id_affectation: 2, id_professeur: 1, id_classe: 2, id_matiere: 3 },
  { id_affectation: 3, id_professeur: 2, id_classe: 1, id_matiere: 2 },
];

export const mockEtudiants: Etudiant[] = [
  { id_etudiant: 1, matricule: "ETU-001", nom: "Martin", prenom: "Alice", id_classe: 1, date_creation: daysAgo(60) },
  { id_etudiant: 2, matricule: "ETU-002", nom: "Bernard", prenom: "Marc", id_classe: 1, date_creation: daysAgo(45) },
  { id_etudiant: 3, matricule: "ETU-003", nom: "Diallo", prenom: "Awa", id_classe: 2, date_creation: daysAgo(30) },
];

export const mockNotes: Note[] = [
  { id_note: 1, note: 15.5, type_evaluation: "devoir", semestre: "S1", id_etudiant: 1, id_matiere: 1, id_professeur: 1, date_saisie: daysAgo(10) },
  { id_note: 2, note: 12, type_evaluation: "composition", semestre: "S1", id_etudiant: 1, id_matiere: 2, id_professeur: 2, date_saisie: daysAgo(8) },
  { id_note: 3, note: 9, type_evaluation: "devoir", semestre: "S1", id_etudiant: 2, id_matiere: 1, id_professeur: 1, date_saisie: daysAgo(10) },
  { id_note: 4, note: 17, type_evaluation: "devoir", semestre: "S1", id_etudiant: 3, id_matiere: 3, id_professeur: 1, date_saisie: daysAgo(6) },
];

export const mockDemandes: DemandeReleve[] = [
  { id_demande: 1, motif: "Dossier de bourse", statut: "en_attente", date_demande: daysAgo(2), id_etudiant: 1 },
];

export const mockReclamations: Reclamation[] = [
  { id_reclamation: 1, motif: "Erreur possible de saisie, j'avais réussi cet exercice", statut: "en_attente", date_reclamation: daysAgo(1), id_etudiant: 2, id_note: 3 },
];
