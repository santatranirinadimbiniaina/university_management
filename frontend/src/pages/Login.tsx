import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CloudOff,
  Eye,
  EyeOff,
  Fingerprint,
  Hash,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, ApiError } from "@/lib/api";
import type { AccountType } from "@/lib/types";
import { Button, Input, Segmented } from "@/components/ui";

const FEATURES = [
  {
    icon: <KeyRound className="h-4.5 w-4.5" />,
    title: "Jetons JWT signés",
    text: "Access et refresh tokens émis par /login, renouvelés via /refresh.",
  },
  {
    icon: <Users className="h-4.5 w-4.5" />,
    title: "Comptes unifiés",
    text: "Super admins et utilisateurs pilotés depuis une seule console.",
  },
  {
    icon: <Fingerprint className="h-4.5 w-4.5" />,
    title: "Permissions fines",
    text: "Rôles, classes et niveaux d'accès appliqués à chaque matricule.",
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
          {/* <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-300">
            Console admin
          </p> */}
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
          Pilotez tous vos{" "}
          <span className="bg-gradient-to-r from-brand-300 via-sky-300 to-brand-200 bg-clip-text text-transparent">
            comptes et accès
          </span>{" "}
          depuis un seul poste.
        </motion.h1>
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-200"
        >
          Console d'administration connectée à vos namespaces Flask-RESTX
          <span className="text-brand-300"> super_admin</span> et
          <span className="text-brand-300"> utilisateurs</span>. Créez, modifiez et révoquez les
          accès en toute confiance.
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

      {/* <motion.div
        custom={6}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative flex items-center gap-2 border-t border-white/8 px-12 py-5"
      >
        <span className="rounded-md bg-white/6 px-2.5 py-1 font-mono text-[11px] text-brand-200 ring-1 ring-white/10">
          GET /super_admin/
        </span>
        <span className="rounded-md bg-white/6 px-2.5 py-1 font-mono text-[11px] text-brand-200 ring-1 ring-white/10">
          GET /utilisateurs/
        </span>
        <span className="ml-auto text-[11px] font-medium uppercase tracking-[0.2em] text-ink-400">
          Flask-RESTX
        </span>
      </motion.div> */}
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
                Identifiez-vous pour accéder à la console d'administration.
              </p>
            </div>

            <Segmented
              layoutId="login-type"
              className="mb-6 w-full"
              value={type}
              onChange={(v) => setType(v as AccountType)}
              options={[
                { value: "super_admin", label: "Super Admin", icon: <Shield /> },
                { value: "utilisateur", label: "Utilisateur", icon: <User /> },
              ]}
            />

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
              <Input
                label="Matricule"
                name="matricule"
                placeholder={type === "super_admin" ? "SA-0001" : "USR-1001"}
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

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              // icon={<Sparkles className="h-4 w-4" />}
              onClick={handleDemo}
            >
              Explorer en mode démo
            </Button>

            {/* <p className="mt-6 flex items-center justify-center gap-2 text-center font-mono text-[11px] text-ink-300">
              <RefreshCw className="h-3 w-3" />
              {API_BASE_URL}/{type === "super_admin" ? "super_admin" : "utilisateurs"}/login
            </p> */}
          </div>

          <p className="mt-5 text-center text-xs text-ink-400">
            Accès réservé au personnel autorisé — chaque connexion est journalisée par le backend.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
