import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  Hash,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useToast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, Input, TypeBadge } from "@/components/ui";
import { tokenExpiry } from "@/lib/jwt";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super administrateur",
  directeur: "Directeur",
  professeur: "Professeur",
  etudiant: "Étudiant",
};

export default function Profil() {
  const { session, logout } = useAuth();
  const { updateProfesseur, updateEtudiant, updateDirecteur } = useData();
  const toast = useToast();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!session) return null;

  const { profile } = session;
  const isSuperAdmin = session.type === "super_admin";
  const displayName = profile.nom || profile.matricule;
  const expiry = tokenExpiry(session.accessToken);

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!motDePasse) next.motDePasse = "Le nouveau mot de passe est requis.";
    else if (motDePasse.length < 4) next.motDePasse = "4 caractères minimum.";
    if (confirmation !== motDePasse) next.confirmation = "La confirmation ne correspond pas.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (session.demo) {
      toast.info("Mode démo", "Le changement de mot de passe est simulé en mode démonstration.");
      setMotDePasse("");
      setConfirmation("");
      return;
    }

    setSubmitting(true);
    try {
      if (session.type === "directeur") {
        await updateDirecteur(profile.id, { mot_de_passe: motDePasse });
      } else if (session.type === "professeur") {
        await updateProfesseur(profile.id, { mot_de_passe: motDePasse });
      } else if (session.type === "etudiant") {
        await updateEtudiant(profile.id, { mot_de_passe: motDePasse });
      }
      toast.success(
        "Mot de passe mis à jour",
        "Votre nouveau mot de passe est actif dès maintenant.",
      );
      setMotDePasse("");
      setConfirmation("");
    } catch (err) {
      toast.error(
        "Échec de la mise à jour",
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink-900 sm:text-[32px]">
          Mon compte
        </h1>
        <p className="mt-1.5 text-sm text-ink-400">
          Vos informations de session et les paramètres de sécurité associés.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
        {/* Carte identité */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="xl:col-span-2"
        >
          <Card className="h-full overflow-hidden">
            <div className="relative flex flex-col items-center bg-gradient-to-br from-ink-800 via-ink-700 to-brand-800 px-6 pb-8 pt-10 text-center">
              <div className="pointer-events-none absolute inset-0 pattern-grid opacity-40" />
              <Avatar label={displayName} size="lg" className="relative !ring-4 !ring-white/15" />
              <p className="relative mt-4 font-display text-xl font-bold tracking-tight text-white">
                {displayName}
              </p>
              <p className="relative mt-1 flex items-center gap-1.5 font-mono text-[13px] text-brand-200">
                <Hash className="h-3.5 w-3.5" />
                {profile.matricule}
              </p>
              <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
                <TypeBadge type={session.type} />
                {session.demo && <Badge variant="warning">Mode démo</Badge>}
              </div>
            </div>
            <dl className="divide-y divide-ink-900/5 px-6">
              {[
                { label: "Identifiant unique", value: `#${profile.id}` },
                { label: "Rôle", value: ROLE_LABEL[session.type] ?? session.type },
                {
                  label: "Type de session",
                  value: isSuperAdmin ? "Super admin" : ROLE_LABEL[session.type] ?? "Utilisateur",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3.5">
                  <dt className="text-[13px] font-medium text-ink-400">{item.label}</dt>
                  <dd className="text-sm font-semibold text-ink-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </motion.div>

        <div className="space-y-5 xl:col-span-3">
          {/* Sécurité */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5 }}
          >
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-900">
                <KeyRound className="h-4.5 w-4.5 text-brand-500" />
                Sécurité
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-400">
                Le nouveau mot de passe est haché par le backend via{" "}
                <span className="font-mono text-[12px]">set_password()</span>.
              </p>
              {isSuperAdmin && (
                <p className="mt-2 text-[13px] text-amber-700">
                  Le mot de passe du super admin se modifie via l'API{" "}
                  <span className="font-mono text-[12px]">/super_admin/&lt;id&gt;</span>.
                </p>
              )}
              <form onSubmit={(e) => void handlePassword(e)} className="mt-5 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Nouveau mot de passe"
                  name="nouveau_mot_de_passe"
                  type={show1 ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<LockKeyhole />}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  error={errors.motDePasse}
                  autoComplete="new-password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShow1((v) => !v)}
                      className="rounded-md p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-600"
                      aria-label="Afficher"
                    >
                      {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <Input
                  label="Confirmation"
                  name="confirmation"
                  type={show2 ? "text" : "password"}
                  placeholder="••••••••"
                  icon={<LockKeyhole />}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  error={errors.confirmation}
                  autoComplete="new-password"
                  rightSlot={
                    <button
                      type="button"
                      onClick={() => setShow2((v) => !v)}
                      className="rounded-md p-1.5 text-ink-300 hover:bg-ink-50 hover:text-ink-600"
                      aria-label="Afficher"
                    >
                      {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    loading={submitting}
                    icon={<ShieldCheck className="h-4 w-4" />}
                    disabled={isSuperAdmin}
                  >
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          {/* Session */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.5 }}
          >
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-ink-900">
                <Fingerprint className="h-4.5 w-4.5 text-brand-500" />
                Session active
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-400">
                Jetons JWT émis par <span className="font-mono text-[12px]">/login</span> et
                renouvelables via <span className="font-mono text-[12px]">/refresh</span>.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-ink-900/8 bg-ink-50/60 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    Expiration du jeton
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-800">
                    {expiry
                      ? expiry.toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : session.demo
                        ? "Illimitée (démo)"
                        : "Non renseignée"}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-900/8 bg-ink-50/60 p-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    <KeyRound className="h-3.5 w-3.5" />
                    Refresh token
                  </p>
                  <p className="mt-2 text-sm font-semibold text-ink-800">
                    {session.demo ? "Simulé" : "Présent et valide"}
                  </p>
                </div>
              </div>
              <div className="mt-5 border-t border-ink-900/6 pt-5">
                <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
                  Fermer la session
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
