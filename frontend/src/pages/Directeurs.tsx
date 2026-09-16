import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { useData } from "@/context/DataContext";
import { ResourceManager } from "@/components/ResourceManager";
import { Badge, Button, Card } from "@/components/ui";
import type { Directeur } from "@/lib/types";

export default function Directeurs() {
  const {
    directeurs,
    etablissements,
    loading,
    createDirecteur,
    updateDirecteur,
    deleteDirecteur,
  } = useData();

  const etabById = useMemo(
    () => new Map(etablissements.map((e) => [e.id_etablissement, e])),
    [etablissements],
  );

  const fields = [
    { name: "matricule", label: "Matricule", required: true, placeholder: "DIR-001" },
    { name: "nom", label: "Nom", required: true, placeholder: "Dia" },
    { name: "prenom", label: "Prénom", placeholder: "Aminata" },
    { name: "email", label: "Email", type: "email" as const, placeholder: "direction@etab.sn" },
    { name: "telephone", label: "Téléphone", placeholder: "+221 77 000 00 00" },
    {
      name: "id_etablissement",
      label: "Établissement",
      required: true,
      options: etablissements.map((e) => ({
        value: String(e.id_etablissement),
        label: e.nom,
      })),
    },
    {
      name: "mot_de_passe",
      label: "Mot de passe",
      type: "password" as const,
      required: true,
      hint: "Le directeur utilisera ce mot de passe avec son matricule pour se connecter.",
    },
  ];

  const editFields = fields.map((f) =>
    f.name === "mot_de_passe"
      ? { ...f, required: false, label: "Nouveau mot de passe", hint: "Laissez vide pour conserver l'actuel." }
      : f,
  );

  if (!loading && etablissements.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-400 ring-1 ring-brand-100">
            <Info className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">
              Créez d'abord un établissement
            </h1>
            <p className="mt-1 max-w-md text-sm text-ink-400">
              Un directeur est responsable d'un établissement existant : commencez par créer
              l'établissement, puis attribuez-lui son directeur ici.
            </p>
          </div>
          <Link to="/etablissements">
            <Button>Aller aux établissements</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <ResourceManager<Directeur>
      title="Directeurs"
      description="Chaque établissement a son directeur : créé par le super admin après l'établissement, c'est lui qui crée les classes, matières, professeurs et étudiants de son établissement."
      entityLabel="Directeur"
      rows={directeurs}
      loading={loading}
      rowId={(d) => d.id_directeur}
      rowLabel={(d) => `${d.prenom ?? ""} ${d.nom}`.trim()}
      rowSub={(d) => d.matricule}
      searchFields={(d) => `${d.nom} ${d.prenom ?? ""} ${d.matricule} ${d.email ?? ""}`}
      createFields={fields}
      editFields={() => editFields}
      createTitle="Nouveau directeur"
      onCreate={(v) =>
        createDirecteur({
          matricule: String(v.matricule),
          nom: String(v.nom),
          prenom: v.prenom ? String(v.prenom) : undefined,
          email: v.email ? String(v.email) : undefined,
          telephone: v.telephone ? String(v.telephone) : undefined,
          id_etablissement: Number(v.id_etablissement),
          mot_de_passe: String(v.mot_de_passe ?? ""),
        })
      }
      onUpdate={(id, v) =>
        updateDirecteur(id, {
          nom: String(v.nom),
          prenom: v.prenom ? String(v.prenom) : undefined,
          email: v.email ? String(v.email) : undefined,
          telephone: v.telephone ? String(v.telephone) : undefined,
          ...(v.mot_de_passe ? { mot_de_passe: String(v.mot_de_passe) } : {}),
        })
      }
      onDelete={deleteDirecteur}
      columns={[
        {
          header: "Établissement",
          render: (d) => {
            const e = etabById.get(d.id_etablissement);
            return e ? <Badge variant="brand">{e.nom}</Badge> : `#${d.id_etablissement}`;
          },
        },
        { header: "Email", render: (d) => d.email || "—" },
        { header: "Téléphone", render: (d) => d.telephone || "—" },
      ]}
    />
  );
}
