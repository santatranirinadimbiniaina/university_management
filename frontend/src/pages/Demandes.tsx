import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, XCircle } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import { Badge, Button, Card, EmptyState, SkeletonRows } from "@/components/ui";
import type { DemandeReleve } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const STATUT_VARIANT = {
  en_attente: "warning",
  traitee: "success",
  refusee: "danger",
} as const;

export default function Demandes() {
  const { demandesReleve, etudiants, loading, traiterDemandeReleve } = useData();
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);

  const etudiantById = new Map(etudiants.map((e) => [e.id_etudiant, e]));

  const traiter = async (d: DemandeReleve, statut: string) => {
    setBusyId(d.id_demande);
    try {
      await traiterDemandeReleve(d.id_demande, statut);
      toast.success(
        statut === "traitee" ? "Demande traitée" : "Demande refusée",
        "L'étudiant verra le statut mis à jour.",
      );
    } catch (err) {
      toast.error("Échec", err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setBusyId(null);
    }
  };

  const triees = [...demandesReleve].sort((a, b) => {
    if (a.statut === "en_attente" && b.statut !== "en_attente") return -1;
    if (b.statut === "en_attente" && a.statut !== "en_attente") return 1;
    return new Date(b.date_demande ?? 0).getTime() - new Date(a.date_demande ?? 0).getTime();
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
          Demandes de relevé
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-ink-400">
          Les demandes de relevé de notes envoyées par les étudiants. Traitez-les après édition du
          document.
        </p>
      </motion.div>

      <Card className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={4} cols={4} />
        ) : triees.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title="Aucune demande"
            description="Les demandes des étudiants apparaîtront ici."
          />
        ) : (
          <div className="divide-y divide-ink-900/5">
            {triees.map((d) => {
              const etu = etudiantById.get(d.id_etudiant);
              return (
                <div key={d.id_demande} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <FileText className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {etu ? `${etu.prenom ?? ""} ${etu.nom}`.trim() : `Étudiant #${d.id_etudiant}`}
                      {etu && (
                        <span className="ml-2 text-xs font-medium text-ink-400">
                          {etu.matricule}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-400">
                      {d.motif || "Sans motif précisé"} · {formatDateTime(d.date_demande)}
                    </p>
                  </div>
                  <Badge variant={STATUT_VARIANT[d.statut]}>{d.statut.replace("_", " ")}</Badge>
                  {d.statut === "en_attente" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busyId === d.id_demande}
                        icon={<CheckCircle2 className="h-4 w-4" />}
                        onClick={() => void traiter(d, "traitee")}
                      >
                        Traiter
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === d.id_demande}
                        icon={<XCircle className="h-4 w-4" />}
                        onClick={() => void traiter(d, "refusee")}
                      >
                        Refuser
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-ink-300">
                      {d.date_traitement ? formatDateTime(d.date_traitement) : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
