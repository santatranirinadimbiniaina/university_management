import { useData } from "@/context/DataContext";
import { ResourceManager } from "@/components/ResourceManager";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Etablissement } from "@/lib/types";

export default function Etablissements() {
  const {
    etablissements,
    loading,
    createEtablissement,
    updateEtablissement,
    deleteEtablissement,
  } = useData();

  const fields = [
    { name: "nom", label: "Nom de l'établissement", required: true, placeholder: "Lycée Démo" },
    { name: "adresse", label: "Adresse", placeholder: "Avenue Centrale" },
    { name: "telephone", label: "Téléphone", placeholder: "+221 33 000 00 00" },
    { name: "email", label: "Email", type: "email" as const, placeholder: "contact@etab.sn" },
  ];

  return (
    <ResourceManager<Etablissement>
      title="Établissements"
      description="Créez et gérez les établissements de votre réseau scolaire."
      entityLabel="Établissement"
      rows={etablissements}
      loading={loading}
      rowId={(e) => e.id_etablissement}
      rowLabel={(e) => e.nom}
      rowSub={(e) => e.adresse || ""}
      searchFields={(e) => `${e.nom} ${e.adresse ?? ""} ${e.email ?? ""}`}
      createFields={fields}
      editFields={() => fields}
      createTitle="Nouvel établissement"
      onCreate={(v) =>
        createEtablissement({
          nom: String(v.nom),
          adresse: v.adresse ? String(v.adresse) : undefined,
          telephone: v.telephone ? String(v.telephone) : undefined,
          email: v.email ? String(v.email) : undefined,
        })
      }
      onUpdate={(id, v) =>
        updateEtablissement(id, {
          nom: String(v.nom),
          adresse: v.adresse ? String(v.adresse) : undefined,
          telephone: v.telephone ? String(v.telephone) : undefined,
          email: v.email ? String(v.email) : undefined,
        })
      }
      onDelete={deleteEtablissement}
      columns={[
        { header: "Téléphone", render: (e) => e.telephone || "—" },
        { header: "Email", render: (e) => e.email || "—" },
        {
          header: "Créé le",
          render: (e) => <Badge variant="neutral">{formatDate(e.date_creation)}</Badge>,
        },
      ]}
    />
  );
}
