import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { SidebarContent } from "./Sidebar";

export function SplashScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950">
      <div className="flex h-16 w-16 animate-pulse-ring items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600">
        <ShieldCheck className="h-8 w-8 text-white" strokeWidth={2.2} />
      </div>
      <p className="mt-6 font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
        Aegis
      </p>
      <p className="mt-1 text-xs text-ink-400">Chargement de la session…</p>
    </div>
  );
}

function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Barre latérale — bureau */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[280px] lg:block">
        <SidebarContent />
      </aside>

      {/* Barre latérale — mobile */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className="absolute inset-y-0 left-0 w-[280px] shadow-lift"
            >
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contenu principal */}
      <div className="lg:pl-[280px]">
        {/* Barre supérieure — mobile */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-900/6 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl border border-ink-200 bg-white p-2.5 text-ink-600 shadow-card transition-colors hover:border-brand-300 hover:text-brand-600"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.4} />
            </span>
            <span className="font-display text-sm font-bold tracking-[0.18em] text-ink-900">
              AEGIS
            </span>
          </div>
        </header>

        <main className="relative mx-auto w-full max-w-[1240px] px-4 pb-16 pt-8 sm:px-8 lg:px-12 lg:pt-10">
          {/* halo décoratif */}
          <div className="pointer-events-none absolute -top-24 right-0 -z-0 h-64 w-64 rounded-full bg-brand-200/40 blur-3xl" />
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { session, initializing } = useAuth();

  if (initializing) return <SplashScreen />;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  );
}
