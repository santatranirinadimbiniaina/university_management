import { useMemo, useState } from "react";
import { GraduationCap, Trash2, UserPlus } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import { ResourceManager } from "@/components/ResourceManager";
import { EntityFormModal } from "@/components/EntityFormModal";
import { Badge, Button, Card, EmptyState, SkeletonRows } from "@/components/ui";
import { ConfirmDialog } from "@/components/Modal";
import type { Affectation, Professeur } from "@/lib/types";

export default function Professeurs() {
  const {
    professeurs,
    classes,
    matieres,
    affectations,
    loading,
    createProfesseur,
    updateProfesseur,
    deleteProfesseur,
    createAffectation,
    deleteAffectation,
  } = useData();
  const toast = useToast();

  const [affOpen, setAffOpen] = useState(false);
  const [deletingAff, setDeletingAff] = useState<Affectation | null>(null);

  const classeById = useMemo(() => new Map(classes.map((c) => [c.id_classe, c])), [classes]);
  const matiereById = useMemo(
    () => new Map(matieres.map((m) => [m.id_matiere, m])),
    [matieres],
  );

  const profFields = [
    { name: "matricule", label: "Matricule", required: true, placeholder: "PROF-001" },
    { name: "nom", label: "Nom", required: true, placeholder: "Dupont" },
    { name: "prenom", label: "Prénom", placeholder: "Jean" },
    { name: "email", label: "Email", type: "email" as const, placeholder: "jean.dupont@ecole.sn" },
    { name: "telephone", label: "Téléphone", placeholder: "+221 77 000 00 00" },
    {
      name: "mot_de_passe",
      label: "Mot de passe",
      type: "password" as const,
      required: true,
      hint: "Le professeur utilisera ce mot de passe avec son matricule pour se connecter.",
    },
  ];

  const editFields = profFields.map((f) =>
    f.name === "mot_de_passe"
      ? { ...f, required: false, label: "Nouveau mot de passe", hint: "Laissez vide pour conserver l'actuel." }
      : f,
  );

  return (
    <div className="space-y-8">
      <ResourceManager<Professeur>
        title="Professeurs"
        description="Chaque professeur dispose d'un identifiant et d'un mot de passe, et peut être affecté à une ou plusieurs classes sur une matière précise."
        entityLabel="Professeur"
        rows={professeurs}
        loading={loading}
        rowId={(p) => p.id_professeur}
        rowLabel={(p) => `${p.prenom ?? ""} ${p.nom}`.trim()}
        rowSub={(p) => p.matricule}
        searchFields={(p) => `${p.nom} ${p.prenom ?? ""} ${p.matricule} ${p.email ?? ""}`}
        createFields={profFields}
        editFields={() => editFields}
        createTitle="Nouveau professeur"
        onCreate={(v) =>
          createProfesseur({
            matricule: String(v.matricule),
            nom: String(v.nom),
            prenom: v.prenom ? String(v.prenom) : undefined,
            email: v.email ? String(v.email) : undefined,
            telephone: v.telephone ? String(v.telephone) : undefined,
            mot_de_passe: String(v.mot_de_passe ?? ""),
          })
        }
        onUpdate={(id, v) =>
          updateProfesseur(id, {
            nom: String(v.nom),
            prenom: v.prenom ? String(v.prenom) : undefined,
            email: v.email ? String(v.email) : undefined,
            telephone: v.telephone ? String(v.telephone) : undefined,
            ...(v.mot_de_passe ? { mot_de_passe: String(v.mot_de_passe) } : {}),
          })
        }
        onDelete={deleteProfesseur}
        columns={[
          { header: "Email", render: (p) => p.email || "—" },
          {
            header: "Affectations",
            render: (p) => {
              const n = affectations.filter((a) => a.id_professeur === p.id_professeur).length;
              return <Badge variant="brand">{n} cours</Badge>;
            },
          },
        ]}
      />

      {/* Affectations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-900">
              Affectations aux classes
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Attribuez à chaque professeur ses classes et ses matières — c'est ce qui détermine
              où il peut saisir des notes.
            </p>
          </div>
          <Button
            size="sm"
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() => setAffOpen(true)}
          >
            Affecter
          </Button>
        </div>

        {loading ? (
          <SkeletonRows rows={3} cols={3} />
        ) : affectations.length === 0 ? (
          <Card>
            <EmptyState
              icon={<GraduationCap />}
              title="Aucune affectation"
              description="Affectez un professeur à une classe pour qu'il puisse y saisir des notes."
              action={
                <Button size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setAffOpen(true)}>
                  Affecter un professeur
                </Button>
              }
            />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="divide-y divide-ink-900/5">
              {affectations.map((a) => {
                const prof = professeurs.find((p) => p.id_professeur === a.id_professeur);
                const classe = classeById.get(a.id_classe);
                const matiere = matiereById.get(a.id_matiere);
                return (
                  <div key={a.id_affectation} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">
                        {prof ? `${prof.prenom ?? ""} ${prof.nom}`.trim() : `Prof #${a.id_professeur}`}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {matiere?.nom_matiere ?? `Matière #${a.id_matiere}`} ·{" "}
                        {classe?.nom_classe ?? `Classe #${a.id_classe}`}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeletingAff(a)}
                      className="rounded-lg p-2 text-ink-300 hover:bg-red-50 hover:text-red-600"
                      aria-label="Retirer l'affectation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Formulaire d'affectation */}
      <EntityFormModal
        open={affOpen}
        onClose={() => setAffOpen(false)}
        title="Affecter un professeur"
        subtitle="Choisissez la classe et la matière que le professeur occupera."
        fields={[
          {
            name: "id_professeur",
            label: "Professeur",
            required: true,
            options: professeurs.map((p) => ({
              value: String(p.id_professeur),
              label: `${p.prenom ?? ""} ${p.nom} (${p.matricule})`,
            })),
          },
          {
            name: "id_classe",
            label: "Classe",
            required: true,
            options: classes.map((c) => ({ value: String(c.id_classe), label: c.nom_classe })),
          },
          {
            name: "id_matiere",
            label: "Matière",
            required: true,
            options: matieres.map((m) => ({
              value: String(m.id_matiere),
              label: `${m.nom_matiere} (coef ${m.coefficient}) — ${classeById.get(m.id_classe)?.nom_classe ?? ""}`,
            })),
          },
        ]}
        onSubmit={async (v) => {
          await createAffectation({
            id_professeur: Number(v.id_professeur),
            id_classe: Number(v.id_classe),
            id_matiere: Number(v.id_matiere),
          });
          toast.success("Affectation créée", "Le professeur peut désormais saisir des notes dans cette classe.");
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingAff)}
        onClose={() => setDeletingAff(null)}
        onConfirm={async () => {
          if (!deletingAff) return;
          try {
            await deleteAffectation(deletingAff.id_affectation);
            toast.success("Affectation retirée");
            setDeletingAff(null);
          } catch (err) {
            toast.error(
              "Échec",
              err instanceof Error ? err.message : "Erreur inconnue.",
            );
          }
        }}
        title="Retirer cette affectation ?"
        message="Le professeur ne pourra plus saisir de notes pour ce cours."
      />
    </div>
  );
}
