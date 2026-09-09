import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Accueil from "@/pages/Accueil";
import Comptes from "@/pages/Comptes";
import Profil from "@/pages/Profil";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Accueil />} />
              <Route path="/comptes" element={<Comptes />} />
              <Route path="/profil" element={<Profil />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
