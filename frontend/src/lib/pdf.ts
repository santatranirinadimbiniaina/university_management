/**
 * Génération de documents PDF via la boîte d'impression du navigateur :
 * aucune dépendance, fonctionne sur mobile (Android/iOS) et bureau avec
 * « Enregistrer au format PDF ».
 */

export interface LigneBulletinPdf {
  matiere: string;
  coefficient: number;
  notes: number[];
  moyenne: number | null;
  remarques: (string | null)[];
}

export interface BulletinPdfData {
  etablissement: string;
  classe: string;
  etudiant: string;
  matricule: string;
  lignes: LigneBulletinPdf[];
  moyenneGenerale: number | null;
}

export interface EntreeResultatPdf {
  rang: number;
  etudiant: string;
  moyenne: number;
}

export interface ResultatsPdfData {
  etablissement: string;
  classe: string;
  semestre?: string | null;
  matieres: { matiere: string; coefficient: number; classement: EntreeResultatPdf[] }[];
  classementGeneral: { rang: number; etudiant: string; moyenne_generale: number | null }[];
}

function ouvrirImpression(titre: string, corpsHtml: string) {
  const fenetre = window.open("", "_blank", "width=820,height=900");
  if (!fenetre) {
    alert("Autorisez les fenêtres pop-up pour générer le PDF.");
    return;
  }
  fenetre.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${titre}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; margin: 36px; }
  .entete { text-align: center; border-bottom: 3px solid #0f5a8a; padding-bottom: 14px; margin-bottom: 22px; }
  .entete h1 { margin: 0; font-size: 20px; letter-spacing: 0.08em; color: #0f5a8a; text-transform: uppercase; }
  .entete p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
  h2 { font-size: 15px; margin: 20px 0 10px; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 12.5px; text-align: left; }
  th { background: #eff6ff; color: #0f5a8a; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.06em; }
  .num { text-align: center; font-variant-numeric: tabular-nums; }
  .moyenne-box { display: inline-block; margin-top: 12px; padding: 12px 22px; border: 2px solid #0f5a8a; border-radius: 10px; }
  .moyenne-box strong { font-size: 20px; color: #0f5a8a; }
  .remarque { color: #92400e; font-style: italic; font-size: 11.5px; }
  .pied { margin-top: 28px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
  @media print { body { margin: 14px; } }
</style>
</head>
<body>${corpsHtml}
<div class="pied"><span>Généré le ${new Date().toLocaleString("fr-FR")}</span><span>GerUniv — gestion scolaire</span></div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`);
  fenetre.document.close();
}

function enteteEtablissement(nom: string, sousTitre: string): string {
  return `<div class="entete"><h1>${nom || "Établissement"}</h1><p>${sousTitre}</p></div>`;
}

/** Bulletin de notes d'un étudiant. */
export function telechargerBulletinPdf(data: BulletinPdfData): void {
  const lignes = data.lignes
    .map(
      (l) => `<tr>
  <td>${l.matiere}</td>
  <td class="num">${l.coefficient}</td>
  <td class="num">${l.notes.map((n) => n.toFixed(2)).join(", ") || "—"}</td>
  <td class="num"><strong>${l.moyenne !== null ? l.moyenne.toFixed(2) : "—"}</strong></td>
  <td>${l.remarques.filter(Boolean).map((r) => `<span class="remarque">« ${r} »</span>`).join(" ") || "—"}</td>
</tr>`,
    )
    .join("");

  ouvrirImpression(
    `Bulletin — ${data.etudiant}`,
    `${enteteEtablissement(
      data.etablissement,
      `Bulletin de notes — ${data.etudiant} (${data.matricule}) — Classe ${data.classe}`,
    )}
<table>
  <thead><tr><th>Matière</th><th>Coef.</th><th>Notes</th><th>Moyenne</th><th>Remarques</th></tr></thead>
  <tbody>${lignes}</tbody>
</table>
${
  data.moyenneGenerale !== null
    ? `<div class="moyenne-box">Moyenne générale : <strong>${data.moyenneGenerale.toFixed(2)} / 20</strong></div>`
    : ""
}`,
  );
}

/** Résultats d'une classe (directeur). */
export function telechargerResultatsPdf(data: ResultatsPdfData): void {
  const sectionsMatieres = data.matieres
    .map(
      (m) => `<h2>${m.matiere} (coef. ${m.coefficient})</h2>
<table>
  <thead><tr><th>Rang</th><th>Étudiant</th><th>Moyenne / 20</th></tr></thead>
  <tbody>${m.classement
    .map(
      (e) =>
        `<tr><td class="num">${e.rang}</td><td>${e.etudiant}</td><td class="num"><strong>${e.moyenne.toFixed(2)}</strong></td></tr>`,
    )
    .join("")}</tbody>
</table>`,
    )
    .join("");

  const general = `<h2>Classement général (moyennes pondérées par coefficients)</h2>
<table>
  <thead><tr><th>Rang</th><th>Étudiant</th><th>Moyenne générale / 20</th></tr></thead>
  <tbody>${data.classementGeneral
    .map(
      (e) =>
        `<tr><td class="num">${e.rang}</td><td>${e.etudiant}</td><td class="num"><strong>${e.moyenne_generale !== null ? e.moyenne_generale.toFixed(2) : "—"}</strong></td></tr>`,
    )
    .join("")}</tbody>
</table>`;

  ouvrirImpression(
    `Résultats — ${data.classe}`,
    `${enteteEtablissement(
      data.etablissement,
      `Résultats d'examen — Classe ${data.classe}${data.semestre ? ` — ${data.semestre}` : ""}`,
    )}
${sectionsMatieres}
${general}`,
  );
}
