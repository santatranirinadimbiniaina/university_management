import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Backpack,
  BriefcaseBusiness,
  CloudOff,
  Eye,
  EyeOff,
  Fingerprint,
  GraduationCap,
  Hash,
  KeyRound,
  LockKeyhole,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import type { AccountType } from "@/lib/types";
import { Button, Input, Segmented } from "@/components/ui";

const FEATURES = [
  {
    icon: <KeyRound className="h-4.5 w-4.5" />,
    title: "Jetons JWT signés",
    text: "Access et refresh tokens émis par /login, renouvelés via /refresh.",
  },
  {
    icon: <GraduationCap className="h-4.5 w-4.5" />,
    title: "Espaces dédiés",
    text: "Super admin, professeurs et étudiants, chacun avec ses propres droits.",
  },
  {
    icon: <Fingerprint className="h-4.5 w-4.5" />,
    title: "Notes sécurisées",
    text: "Seul le professeur affecté à une classe peut y saisir des notes.",
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

const PLACEHOLDERS: Record<AccountType, string> = {
  super_admin: "SA-0001",
  directeur: "DIR-001",
  professeur: "PROF-001",
  etudiant: "ETU-001",
};

function BrandPanel() {
  return (
    <div className="relative hidden w-[46%] overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-brand-800 lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 pattern-grid" />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="pointer-events-none absolute right-16 top-24 h-56 w-56 animate-float-slow rounded-full border border-brand-300/20" />
      <div className="pointer-events-none absolute right-36 top-44 h-24 w-24 animate-float rounded-full border border-brand-300/30" />

      <div className="relative flex items-center gap-3 px-12 pt-10">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
          <ShieldCheck className="h-5.5 w-5.5 text-white" strokeWidth={2.2} />
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-none tracking-[0.18em] text-white">
            GERUNIV
          </p>
        </div>
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

        <div className="mt-10 space-y-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={3 + i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/25 text-brand-200 ring-1 ring-brand-400/30">
                {feature.icon}
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight text-white">{feature.title}</p>
                <p className="mt-0.5 text-[13px] leading-snug text-ink-300">{feature.text}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const { session, login, loginDemo } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState<AccountType>("super_admin");
  const [matricule, setMatricule] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; offline: boolean } | null>(null);

  if (session) return <Navigate to="/" replace />;

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
      <BrandPanel />

      <div className="relative flex flex-1 items-center justify-center px-5 py-12">
        <div className="pointer-events-none absolute inset-0 pattern-grid-light opacity-70 mask-fade-b" />

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[440px]"
        >
          {/* Marque mobile */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <p className="font-display text-lg font-bold tracking-[0.18em] text-ink-900">GERUNIV</p>
          </div>

          <div className="rounded-3xl border border-ink-900/8 bg-white p-7 shadow-lift sm:p-9">
            <div className="mb-7">
              <h2 className="font-display text-[26px] font-bold tracking-tight text-ink-900">
                Connexion
              </h2>
              <p className="mt-1 text-sm text-ink-400">
                Accédez à votre espace selon votre profil.
              </p>
            </div>

            <Segmented
              layoutId="login-type"
              className="mb-6 w-full"
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={[
                { value: "super_admin", label: "Admin", icon: <Shield /> },
                { value: "directeur", label: "Directeur", icon: <BriefcaseBusiness /> },
                { value: "professeur", label: "Professeur", icon: <GraduationCap /> },
                { value: "etudiant", label: "Étudiant", icon: <Backpack /> },
              ]}
            />

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
              <Input
                label="Matricule"
                name="matricule"
                placeholder={PLACEHOLDERS[type]}
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
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-[13px] font-medium leading-snug ${
                    error.offline
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
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
          </div>

          <p className="mt-5 text-center text-xs text-ink-400">
            Accès réservé aux membres de l'établissement — chaque connexion est journalisée par le
            backend.
          </p>
          <p className="mt-2 hidden items-center justify-center gap-1.5 text-[11px] text-ink-300 sm:flex">
            <User className="h-3 w-3" />
            Les comptes sont créés par le super administrateur.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
