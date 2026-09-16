import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/components/Toast";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Accueil from "@/pages/Accueil";
import Etablissements from "@/pages/Etablissements";
import Directeurs from "@/pages/Directeurs";
import Classes from "@/pages/Classes";
import Professeurs from "@/pages/Professeurs";
import Etudiants from "@/pages/Etudiants";
import Demandes from "@/pages/Demandes";
import MesNotes from "@/pages/MesNotes";
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
              <Route path="/etablissements" element={<Etablissements />} />
              <Route path="/directeurs" element={<Directeurs />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/professeurs" element={<Professeurs />} />
              <Route path="/etudiants" element={<Etudiants />} />
              <Route path="/demandes" element={<Demandes />} />
              <Route path="/mes-notes" element={<MesNotes />} />
              <Route path="/profil" element={<Profil />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
