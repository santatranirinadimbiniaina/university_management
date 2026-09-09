import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Hash, LockKeyhole, Shield, User, UserPlus } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "./Toast";
import type { SuperAdmin, Utilisateur } from "@/lib/types";
import { Modal } from "./Modal";
import { Button, Input, Segmented, Select } from "./ui";

export type AccountKind = "utilisateur" | "admin";

interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
  kind: AccountKind;
  /** Compte existant à modifier ; null ou absent = création. */
  account?: SuperAdmin | Utilisateur | null;
}

const ROLES = ["administrateur", "enseignant", "eleve", "personnel"];
const CLASSES = ["aucune", "6eme", "5eme", "4eme", "3eme", "2nde", "1ere", "terminale"];
const PERMISSIONS = ["lecture", "ecriture", "totale"];

const isUtilisateur = (a: SuperAdmin | Utilisateur): a is Utilisateur => "nom" in a;

export function AccountFormModal({ open, onClose, kind, account }: AccountFormModalProps) {
  const editing = Boolean(account);
  const [currentKind, setCurrentKind] = useState<AccountKind>(kind);
  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState(ROLES[1]);
  const [classe, setClasse] = useState(CLASSES[0]);
  const [permission, setPermission] = useState(PERMISSIONS[0]);
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const data = useData();
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setCurrentKind(kind);
    setErrors({});
    setMotDePasse("");
    setShowPassword(false);
    if (account) {
      setMatricule(account.matricule);
      if (isUtilisateur(account)) {
        setNom(account.nom);
        setRole(account.role || ROLES[1]);
        setClasse(account.classe || CLASSES[0]);
        setPermission(account.permission || PERMISSIONS[0]);
      } else {
        setNom("");
      }
    } else {
      setMatricule("");
      setNom("");
      setRole(ROLES[1]);
      setClasse(CLASSES[0]);
      setPermission(PERMISSIONS[0]);
    }
  }, [open, account, kind]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!matricule.trim()) next.matricule = "Le matricule est requis.";
    if (currentKind === "utilisateur" && !nom.trim()) next.nom = "Le nom est requis.";
    if (!editing && !motDePasse) next.mot_de_passe = "Le mot de passe est requis.";
    if (motDePasse && motDePasse.length < 4)
      next.mot_de_passe = "4 caractères minimum.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (currentKind === "utilisateur") {
        const payload = {
          matricule: matricule.trim(),
          nom: nom.trim(),
          role,
          classe,
          permission,
          ...(motDePasse ? { mot_de_passe: motDePasse } : {}),
        };
        if (editing && account) {
          await data.updateUtilisateur(account.id, payload);
          toast.success("Utilisateur mis à jour", `${matricule} a été modifié avec succès.`);
        } else {
          await data.createUtilisateur({ ...payload, mot_de_passe: motDePasse });
          toast.success("Utilisateur créé", `${nom} rejoint la plateforme.`);
        }
      } else {
        const payload = {
          matricule: matricule.trim(),
          ...(motDePasse ? { mot_de_passe: motDePasse } : {}),
        };
        if (editing && account) {
          await data.updateAdmin(account.id, payload);
          toast.success("Super admin mis à jour", `${matricule} a été modifié.`);
        } else {
          await data.createAdmin({ ...payload, mot_de_passe: motDePasse });
          toast.success("Super admin créé", `${matricule} dispose désormais des pleins pouvoirs.`);
        }
      }
      onClose();
    } catch (err) {
      toast.error(
        editing ? "Échec de la modification" : "Échec de la création",
        err instanceof Error ? err.message : "Une erreur est survenue.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Modifier le compte" : "Nouveau compte"}
      subtitle={
        editing
          ? "Mettez à jour les informations du compte sélectionné."
          : "Créez un accès conforme au modèle du backend Flask."
      }
      icon={<UserPlus />}
      maxWidth="max-w-xl"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        {!editing && (
          <div>
            <p className="mb-1.5 text-[13px] font-semibold tracking-tight text-ink-700">
              Type de compte
            </p>
            <Segmented
              layoutId="account-kind"
              value={currentKind}
              onChange={(v) => setCurrentKind(v as AccountKind)}
              options={[
                { value: "utilisateur", label: "Utilisateur", icon: <User /> },
                { value: "admin", label: "Super admin", icon: <Shield /> },
              ]}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Matricule"
            name="matricule"
            placeholder={currentKind === "admin" ? "SA-0001" : "USR-1001"}
            icon={<Hash />}
            value={matricule}
            onChange={(e) => setMatricule(e.target.value)}
            error={errors.matricule}
            autoComplete="off"
          />
          {currentKind === "utilisateur" ? (
            <Input
              label="Nom complet"
              name="nom"
              placeholder="Awa Ndiaye"
              icon={<User />}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              error={errors.nom}
              autoComplete="off"
            />
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>

        {currentKind === "utilisateur" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Rôle" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </Select>
            <Select label="Classe" value={classe} onChange={(e) => setClasse(e.target.value)}>
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c === "aucune" ? "Aucune" : c.toUpperCase()}
                </option>
              ))}
            </Select>
            <Select
              label="Permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
            >
              {PERMISSIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </Select>
          </div>
        )}

        <Input
          label={editing ? "Nouveau mot de passe" : "Mot de passe"}
          name="mot_de_passe"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          icon={<LockKeyhole />}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          error={errors.mot_de_passe}
          hint={editing && !errors.mot_de_passe ? "Laissez vide pour conserver le mot de passe actuel." : undefined}
          autoComplete="new-password"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-ink-50 hover:text-ink-600"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-end gap-3 border-t border-ink-900/6 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            {editing ? "Enregistrer" : "Créer le compte"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
