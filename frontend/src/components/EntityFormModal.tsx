import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Input, Select } from "./ui";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "password" | "number" | "date" | "email";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  min?: number;
  step?: string;
}

interface EntityFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  fields: FieldDef[];
  initial?: Record<string, unknown>;
  onSubmit: (values: Record<string, string | number>) => Promise<void>;
  submitLabel?: string;
  /** Appelé à chaque modification de champ (ex. pour filtrer des options). */
  onFieldChange?: (name: string, value: string) => void;
}

export function EntityFormModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  fields,
  initial,
  onSubmit,
  submitLabel,
  onFieldChange,
}: EntityFormModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base: Record<string, string> = {};
    fields.forEach((f) => {
      const v = initial?.[f.name];
      base[f.name] = v === undefined || v === null ? "" : String(v);
    });
    setValues(base);
    setErrors({});
    setApiError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required && !values[f.name]?.trim()) {
        next[f.name] = `${f.label} est requis.`;
      }
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setApiError(null);
    try {
      const payload: Record<string, string | number> = {};
      fields.forEach((f) => {
        const raw = values[f.name]?.trim();
        if (raw === "" || raw === undefined) return;
        payload[f.name] =
          f.type === "number" && raw !== "" ? Number(raw) : raw;
      });
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} icon={icon ?? <Plus />}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) =>
            field.options ? (
              <div key={field.name} className={field.name === "mot_de_passe" ? "sm:col-span-2" : ""}>
                <Select
                  label={field.label}
                  value={values[field.name] ?? ""}
                  error={errors[field.name]}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [field.name]: e.target.value }));
                    onFieldChange?.(field.name, e.target.value);
                  }}
                >
                  <option value="">— Choisir —</option>
                  {field.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <Input
                key={field.name}
                label={field.label}
                name={field.name}
                type={field.type ?? "text"}
                placeholder={field.placeholder}
                step={field.step}
                hint={field.hint}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                error={errors[field.name]}
                autoComplete="off"
              />
            ),
          )}
        </div>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-[13px] font-medium text-red-700">
            {apiError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-ink-900/6 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" loading={submitting}>
            {submitLabel ?? "Enregistrer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
