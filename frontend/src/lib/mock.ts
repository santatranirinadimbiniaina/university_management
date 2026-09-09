import type { SuperAdmin, Utilisateur } from "./types";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

/** Jeu de données hors-ligne pour explorer l'interface sans serveur Flask. */
export const mockAdmins: SuperAdmin[] = [
  { id: 1, matricule: "SA-0001", date_creation: daysAgo(214) },
  { id: 2, matricule: "SA-0002", date_creation: daysAgo(178) },
  { id: 3, matricule: "SA-0107", date_creation: daysAgo(96) },
  { id: 4, matricule: "SA-0123", date_creation: daysAgo(41) },
  { id: 5, matricule: "SA-0140", date_creation: daysAgo(6) },
];

export const mockUtilisateurs: Utilisateur[] = [
  { id: 1, matricule: "USR-1001", nom: "Awa Ndiaye", role: "enseignant", classe: "terminale", permission: "ecriture", date_creation: daysAgo(210) },
  { id: 2, matricule: "USR-1002", nom: "Moussa Diallo", role: "eleve", classe: "3eme", permission: "lecture", date_creation: daysAgo(204) },
  { id: 3, matricule: "USR-1003", nom: "Fatou Sow", role: "administrateur", classe: "aucune", permission: "totale", date_creation: daysAgo(187) },
  { id: 4, matricule: "USR-1004", nom: "Ibrahima Ba", role: "enseignant", classe: "6eme", permission: "ecriture", date_creation: daysAgo(169) },
  { id: 5, matricule: "USR-1005", nom: "Mariam Camara", role: "eleve", classe: "1ere", permission: "lecture", date_creation: daysAgo(154) },
  { id: 6, matricule: "USR-1006", nom: "Ousmane Sy", role: "personnel", classe: "aucune", permission: "lecture", date_creation: daysAgo(133) },
  { id: 7, matricule: "USR-1007", nom: "Aïcha Traoré", role: "eleve", classe: "5eme", permission: "lecture", date_creation: daysAgo(118) },
  { id: 8, matricule: "USR-1008", nom: "Sékou Kouyaté", role: "enseignant", classe: "2nde", permission: "ecriture", date_creation: daysAgo(92) },
  { id: 9, matricule: "USR-1009", nom: "Bintou Koné", role: "eleve", classe: "4eme", permission: "lecture", date_creation: daysAgo(74) },
  { id: 10, matricule: "USR-1010", nom: "Lamine Fofana", role: "eleve", classe: "terminale", permission: "lecture", date_creation: daysAgo(58) },
  { id: 11, matricule: "USR-1011", nom: "Nafissatou Bah", role: "administrateur", classe: "aucune", permission: "totale", date_creation: daysAgo(33) },
  { id: 12, matricule: "USR-1012", nom: "Cheikh Gueye", role: "personnel", classe: "aucune", permission: "ecriture", date_creation: daysAgo(21) },
  { id: 13, matricule: "USR-1013", nom: "Aminata Keita", role: "eleve", classe: "2nde", permission: "lecture", date_creation: daysAgo(9) },
  { id: 14, matricule: "USR-1014", nom: "Paul Mendy", role: "enseignant", classe: "1ere", permission: "ecriture", date_creation: daysAgo(2) },
];
