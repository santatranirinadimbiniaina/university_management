import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Backpack,
  BriefcaseBusiness,
  CloudOff,
  Eye,
  EyeOff,
  GraduationCap,
  Hash,
  KeyRound,
  LockKeyhole,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import type { AccountType } from "@/lib/types";
import { Button, Input } from "@/components/ui";
import { cn } from "@/utils/cn";

const ROLES: {
  type: AccountType;
  label: string;
  description: string;
  placeholder: string;
  icon: typeof Shield;
  gradient: string;
}[] = [
  {
    type: "super_admin",
    label: "Super admin",
    description: "Crée les établissements et leurs directeurs",
    placeholder: "SA-0001",
    icon: Shield,
    gradient: "from-ink-600 to-ink-800",
  },
  {
    type: "directeur",
    label: "Directeur",
    description: "Gère son établissement : classes, profs, élèves",
    placeholder: "DIR-001",
    icon: BriefcaseBusiness,
    gradient: "from-brand-500 to-brand-700",
  },
  {
    type: "professeur",
    label: "Professeur",
    description: "Saisit les notes de ses classes et matières",
    placeholder: "PROF-001",
    icon: GraduationCap,
    gradient: "from-sky-500 to-brand-600",
  },
  {
    type: "etudiant",
    label: "Étudiant",
    description: "Consulte ses notes et demande ses relevés",
    placeholder: "ETU-001",
    icon: Backpack,
    gradient: "from-emerald-500 to-teal-600",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.12 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Login() {
  const { session, login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [etape, setEtape] = useState<"choix" | "formulaire">("choix");
  const [type, setType] = useState<AccountType>("super_admin");
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; offline: boolean } | null>(null);

  if (session) return <Navigate to="/" replace />;

  const roleActif = ROLES.find((r) => r.type === type) ?? ROLES[0];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!matricule.trim() || !motDePasse) {
      setError({ message: "Matricule et mot de passe requis.", offline: false });
      return;
    }
    setSubmitting(true);
    try {
      await login(type, matricule.trim(), motDePasse);
      navigate("/", { replace: true });
    } catch (err) {
      const offline = err instanceof ApiError && err.status === 0;
      setError({
        message: err instanceof Error ? err.message : "Identifiants invalides.",
        offline,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemo = () => {
    loginDemo();
    navigate("/", { replace: true });
  };

  return (
    <main className="flex min-h-screen bg-canvas">
      {/* Panneau de marque — bureau uniquement */}
      <div className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute inset-0 pattern-grid" />
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3 px-12 pt-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <ShieldCheck className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
          </div>
          <p className="font-display text-lg font-bold leading-none tracking-[0.18em] text-white">
            GERUNIV
          </p>
        </div>

        <div className="relative flex flex-1 flex-col justify-center px-12">
          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="font-display text-balance text-4xl font-bold leading-[1.08] tracking-tight text-white xl:text-[2.9rem]"
          >
            Gérez votre établissement,{" "}
            <span className="bg-gradient-to-r from-brand-300 via-sky-300 to-brand-200 bg-clip-text text-transparent">
              vos classes et vos notes
            </span>{" "}
            en un seul endroit.
          </motion.h1>
          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-200"
          >
            Plateforme de gestion scolaire : établissements, classes, matières avec
            coefficients, professeurs affectés, étudiants et relevés de notes.
          </motion.p>
        </div>
      </div>

      {/* Colonne connexion */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="pointer-events-none absolute inset-0 pattern-grid-light opacity-70 mask-fade-b" />

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[460px]"
        >
          {/* Marque mobile */}
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <p className="font-display text-lg font-bold tracking-[0.18em] text-ink-900">GERUNIV</p>
          </div>

          <div className="rounded-3xl border border-ink-900/8 bg-white p-5 shadow-lift sm:p-8">
            {etape === "choix" ? (
              /* ══════════════ ÉTAPE 1 : choix du profil ══════════════ */
              <>
                <div className="mb-6">
                  <h2 className="font-display text-[24px] font-bold tracking-tight text-ink-900 sm:text-[26px]">
                    Connexion
                  </h2>
                  <p className="mt-1 text-sm text-ink-400">
                    Choisissez votre profil pour continuer.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {ROLES.map((role, i) => (
                    <motion.button
                      key={role.type}
                      type="button"
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.07, duration: 0.4 }}
                      onClick={() => {
                        setType(role.type);
                        setEtape("formulaire");
                        setError(null);
                      }}
                      className="group flex flex-col items-start gap-3 rounded-2xl border border-ink-900/8 bg-white p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift active:scale-[0.98]"
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-[0_8px_18px_-6px_rgb(51_95_138/0.6)] transition-transform duration-200 group-hover:scale-105 [&>svg]:h-5 [&>svg]:w-5",
                          role.gradient,
                        )}
                      >
                        <role.icon strokeWidth={2.2} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold tracking-tight text-ink-900">
                          {role.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-ink-400">
                          {role.description}
                        </span>
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-ink-100" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-300">
                    ou
                  </span>
                  <span className="h-px flex-1 bg-ink-100" />
                </div>

                <Button variant="secondary" size="lg" className="w-full" onClick={handleDemo}>
                  Explorer en mode démo
                </Button>
              </>
            ) : (
              /* ══════════════ ÉTAPE 2 : formulaire ══════════════ */
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEtape("choix");
                    setError(null);
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-400 transition-colors hover:text-brand-600"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Changer de profil
                </button>

                <div className="mb-6 flex items-center gap-3.5">
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_8px_18px_-6px_rgb(51_95_138/0.6)] [&>svg]:h-5.5 [&>svg]:w-5.5",
                      roleActif.gradient,
                    )}
                  >
                    <roleActif.icon strokeWidth={2.2} />
                  </span>
                  <div>
                    <h2 className="font-display text-[22px] font-bold leading-tight tracking-tight text-ink-900">
                      Espace {roleActif.label.toLowerCase()}
                    </h2>
                    <p className="text-[13px] text-ink-400">{roleActif.description}</p>
                  </div>
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
                  <Input
                    label="Matricule"
                    name="matricule"
                    placeholder={roleActif.placeholder}
                    icon={<Hash />}
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    autoComplete="username"
                    autoFocus
                  />
                  <Input
                    label="Mot de passe"
                    name="mot_de_passe"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    icon={<LockKeyhole />}
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    autoComplete="current-password"
                    rightSlot={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600"
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3.5 text-[13px] font-medium leading-snug",
                        error.offline
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-700",
                      )}
                    >
                      {error.offline ? (
                        <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>{error.message}</span>
                    </motion.div>
                  )}

                  <Button type="submit" size="lg" className="w-full" loading={submitting}>
                    Se connecter
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-ink-100" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-300">
                    ou
                  </span>
                  <span className="h-px flex-1 bg-ink-100" />
                </div>

                <Button variant="secondary" size="lg" className="w-full" onClick={handleDemo}>
                  Explorer en mode démo
                </Button>
              </>
            )}
          </div>

          <p className="mt-5 text-center text-xs text-ink-400">
            <KeyRound className="mr-1 inline h-3 w-3" />
            Chaque connexion est sécurisée par jeton JWT.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
