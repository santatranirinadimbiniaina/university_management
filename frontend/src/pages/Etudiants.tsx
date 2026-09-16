import { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { ResourceManager } from "@/components/ResourceManager";
import { Badge } from "@/components/ui";
import type { Etudiant } from "@/lib/types";

export default function Etudiants() {
  const { etudiants, classes, loading, createEtudiant, updateEtudiant, deleteEtudiant } =
    useData();

  const classeById = useMemo(() => new Map(classes.map((c) => [c.id_classe, c])), [classes]);

  const fields = [
    { name: "matricule", label: "Matricule", required: true, placeholder: "ETU-001" },
    { name: "nom", label: "Nom", required: true, placeholder: "Martin" },
    { name: "prenom", label: "Prénom", placeholder: "Alice" },
    { name: "date_naissance", label: "Date de naissance", type: "date" as const },
    { name: "email", label: "Email", type: "email" as const, placeholder: "alice@mail.com" },
    {
      name: "id_classe",
      label: "Classe",
      required: true,
      options: classes.map((c) => ({
        value: String(c.id_classe),
        label: c.nom_classe,
      })),
    },
    {
      name: "mot_de_passe",
      label: "Mot de passe",
      type: "password" as const,
      required: true,
      hint: "L'étudiant utilisera ce mot de passe avec son matricule pour consulter ses notes.",
    },
  ];

  const editFields = fields.map((f) =>
    f.name === "mot_de_passe"
      ? { ...f, required: false, label: "Nouveau mot de passe", hint: "Laissez vide pour conserver l'actuel." }
      : f,
  );

  return (
    <ResourceManager<Etudiant>
      title="Étudiants"
      description="Inscrivez les étudiants dans les classes ; chacun reçoit un identifiant et un mot de passe pour consulter ses notes et demander un relevé."
      entityLabel="Étudiant"
      rows={etudiants}
      loading={loading}
      rowId={(e) => e.id_etudiant}
      rowLabel={(e) => `${e.prenom ?? ""} ${e.nom}`.trim()}
      rowSub={(e) => e.matricule}
      searchFields={(e) => `${e.nom} ${e.prenom ?? ""} ${e.matricule} ${e.email ?? ""}`}
      createFields={fields}
      editFields={() => editFields}
      createTitle="Nouvel étudiant"
      onCreate={(v) =>
        createEtudiant({
          matricule: String(v.matricule),
          nom: String(v.nom),
          prenom: v.prenom ? String(v.prenom) : undefined,
          date_naissance: v.date_naissance ? String(v.date_naissance) : undefined,
          email: v.email ? String(v.email) : undefined,
          id_classe: Number(v.id_classe),
          mot_de_passe: String(v.mot_de_passe ?? ""),
        })
      }
      onUpdate={(id, v) =>
        updateEtudiant(id, {
          nom: String(v.nom),
          prenom: v.prenom ? String(v.prenom) : undefined,
          email: v.email ? String(v.email) : undefined,
          ...(v.id_classe ? { id_classe: Number(v.id_classe) } : {}),
          ...(v.mot_de_passe ? { mot_de_passe: String(v.mot_de_passe) } : {}),
        })
      }
      onDelete={deleteEtudiant}
      columns={[
        {
          header: "Classe",
          render: (e) => {
            const c = classeById.get(e.id_classe);
            return c ? (
              <Badge variant="brand">{c.nom_classe}</Badge>
            ) : (
              `#${e.id_classe}`
            );
          },
        },
        { header: "Email", render: (e) => e.email || "—" },
        { header: "Date de naissance", render: (e) => e.date_naissance || "—" },
      ]}
    />
  );
}
