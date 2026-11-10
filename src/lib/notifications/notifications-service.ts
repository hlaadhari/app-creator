import { supabase } from "@/integrations/supabase/client";

export type NotificationKind =
  "correction" | "tuteur" | "examen" | "invitation_classe" | "synchronisation" | "systeme";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Nombre maximal de notifications chargées dans le centre (les plus récentes). */
export const NOTIFICATIONS_LIMITE = 50;

interface LigneNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

const COLONNES = "id, kind, title, body, href, read_at, created_at";

const TYPES_CONNUS: readonly NotificationKind[] = [
  "correction",
  "tuteur",
  "examen",
  "invitation_classe",
  "synchronisation",
  "systeme",
];

export function versNotification(ligne: LigneNotification): AppNotification {
  const kind = TYPES_CONNUS.find((k) => k === ligne.kind) ?? "systeme";
  return {
    id: ligne.id,
    kind,
    title: ligne.title,
    body: ligne.body,
    href: estCheminInterne(ligne.href) ? ligne.href : null,
    readAt: ligne.read_at,
    createdAt: ligne.created_at,
  };
}

/**
 * Défense en profondeur : la base refuse déjà les liens externes (contrainte CHECK),
 * mais le client ne suit jamais autre chose qu'un chemin interne.
 */
export function estCheminInterne(href: string | null): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

/** Notifications de l'utilisateur connecté, les plus récentes d'abord (RLS : les siennes seulement). */
export async function listerNotifications(
  limite: number = NOTIFICATIONS_LIMITE,
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(COLONNES)
    .order("created_at", { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map(versNotification);
}

/** Nombre exact de notifications non lues, indépendant de la limite de la liste. */
export async function compterNonLues(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function marquerCommeLue(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

export async function marquerToutesCommeLues(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) throw new Error(error.message);
}

/**
 * Abonnement Realtime aux changements de ses propres notifications. Supabase applique la RLS
 * aux diffusions : un utilisateur ne reçoit que ce qu'il pourrait lire. Retourne la fonction
 * de désabonnement.
 */
export function abonnerNotifications(
  userId: string,
  surChangement: (evenement: "INSERT" | "UPDATE" | "DELETE", ligne: AppNotification | null) => void,
): () => void {
  const canal = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        const evenement = payload.eventType;
        const brute = (payload.new ?? null) as LigneNotification | null;
        surChangement(evenement, brute && brute.id ? versNotification(brute) : null);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}

const UNITES: { unite: Intl.RelativeTimeFormatUnit; secondes: number }[] = [
  { unite: "day", secondes: 86_400 },
  { unite: "hour", secondes: 3_600 },
  { unite: "minute", secondes: 60 },
];

/** « il y a 5 minutes », « hier »… en français. */
export function formaterDateRelative(iso: string, maintenant: number = Date.now()): string {
  const ecart = Math.round((new Date(iso).getTime() - maintenant) / 1000);
  if (Number.isNaN(ecart)) return "";
  const formateur = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  for (const { unite, secondes } of UNITES) {
    if (Math.abs(ecart) >= secondes) return formateur.format(Math.round(ecart / secondes), unite);
  }
  return "à l'instant";
}
