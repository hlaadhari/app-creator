import { toast } from "sonner";

/**
 * Point d'entrée unique des retours éphémères (toasts) de l'application (#238).
 * Les alertes critiques d'examen (échéance, verrouillage) restent des bandeaux
 * et ne passent pas par ici.
 */
export interface NotifyOptions {
  /** Détail secondaire affiché sous le titre. */
  description?: string;
  /** Durée d'affichage en ms (défaut : 4000, 8000 pour une erreur). */
  duration?: number;
  /** Identifiant stable : une nouvelle notification de même id remplace la précédente. */
  id?: string;
}

function options(opts: NotifyOptions | undefined, defaultDuration: number) {
  return {
    duration: opts?.duration ?? defaultDuration,
    ...(opts?.description ? { description: opts.description } : {}),
    ...(opts?.id ? { id: opts.id } : {}),
  };
}

export const notify = {
  success: (message: string, opts?: NotifyOptions) => toast.success(message, options(opts, 4000)),
  error: (message: string, opts?: NotifyOptions) => toast.error(message, options(opts, 8000)),
  info: (message: string, opts?: NotifyOptions) => toast.info(message, options(opts, 4000)),
  dismiss: (id?: string) => toast.dismiss(id),
};
