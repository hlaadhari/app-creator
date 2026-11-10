import { useState } from "react";
import { Bell, BookCheck, Bot, CloudOff, Clock, Users } from "lucide-react";
import type { ReactNode } from "react";
import {
  formaterDateRelative,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications/notifications-service";

/** Nombre d'éléments affichés avant « Tout voir ». */
export const NOTIFICATIONS_VISIBLES = 5;

const ICONES: Record<NotificationKind, ReactNode> = {
  correction: <BookCheck className="h-4 w-4 text-emerald-400" />,
  tuteur: <Bot className="h-4 w-4 text-primary" />,
  examen: <Clock className="h-4 w-4 text-amber-400" />,
  invitation_classe: <Users className="h-4 w-4 text-sky-400" />,
  synchronisation: <CloudOff className="h-4 w-4 text-amber-400" />,
  systeme: <Bell className="h-4 w-4 text-muted-foreground" />,
};

interface NotificationListProps {
  notifications: AppNotification[];
  nonLues: number;
  chargement: boolean;
  erreur: boolean;
  onMarquerLue: (id: string) => void;
  onToutMarquerLu: () => void;
}

/** Contenu du centre de notifications : onglets Tout / Non lus, 5 éléments puis « Tout voir ». */
export function NotificationList({
  notifications,
  nonLues,
  chargement,
  erreur,
  onMarquerLue,
  onToutMarquerLu,
}: NotificationListProps) {
  const [onglet, setOnglet] = useState<"tout" | "non-lues">("tout");
  const [toutVoir, setToutVoir] = useState(false);

  const filtrees =
    onglet === "non-lues" ? notifications.filter((n) => n.readAt === null) : notifications;
  const visibles = toutVoir ? filtrees : filtrees.slice(0, NOTIFICATIONS_VISIBLES);
  const reste = filtrees.length - visibles.length;

  return (
    <div className="flex min-h-0 flex-col text-sm">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div role="group" aria-label="Filtrer les notifications" className="flex gap-1">
          {(
            [
              ["tout", "Tout"],
              ["non-lues", `Non lus${nonLues > 0 ? ` (${nonLues})` : ""}`],
            ] as const
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              type="button"
              aria-pressed={onglet === cle}
              onClick={() => {
                setOnglet(cle);
                setToutVoir(false);
              }}
              className={`rounded px-2.5 py-1.5 text-xs font-medium cursor-pointer max-md:min-h-11 ${
                onglet === cle
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {libelle}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToutMarquerLu}
          disabled={nonLues === 0}
          className="rounded px-2 py-1.5 text-xs text-primary underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer max-md:min-h-11"
        >
          Tout marquer comme lu
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {chargement ? (
          <p className="p-4 text-xs text-muted-foreground">Chargement…</p>
        ) : erreur ? (
          <p role="alert" className="p-4 text-xs text-rose-400">
            Impossible de charger les notifications.
          </p>
        ) : visibles.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            {onglet === "non-lues" ? "Aucune notification non lue." : "Aucune notification."}
          </p>
        ) : (
          <ul>
            {visibles.map((n) => (
              <li key={n.id} className="border-b last:border-b-0">
                <NotificationItem notification={n} onMarquerLue={onMarquerLue} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {!chargement && !erreur && reste > 0 && (
        <button
          type="button"
          onClick={() => setToutVoir(true)}
          className="border-t px-3 py-2 text-xs font-medium text-primary hover:bg-accent/40 cursor-pointer max-md:min-h-11"
        >
          Tout voir ({reste} de plus)
        </button>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onMarquerLue,
}: {
  notification: AppNotification;
  onMarquerLue: (id: string) => void;
}) {
  const nonLue = n.readAt === null;
  const contenu = (
    <>
      <span className="mt-0.5 shrink-0">{ICONES[n.kind]}</span>
      <span className="min-w-0 flex-1">
        <span className={`block ${nonLue ? "font-semibold" : "font-medium"} text-foreground`}>
          {n.title}
        </span>
        {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {formaterDateRelative(n.createdAt)}
        </span>
      </span>
      {nonLue && (
        <span
          role="img"
          aria-label="Non lue"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
        />
      )}
    </>
  );
  const classes =
    "flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent/40 max-md:min-h-11";

  // Le lien est un chemin interne (contrainte CHECK en base, revérifié par versNotification).
  return n.href ? (
    <a
      href={n.href}
      onClick={() => nonLue && onMarquerLue(n.id)}
      className={`${classes} cursor-pointer`}
    >
      {contenu}
    </a>
  ) : (
    <button
      type="button"
      onClick={() => nonLue && onMarquerLue(n.id)}
      className={`${classes} cursor-pointer`}
    >
      {contenu}
    </button>
  );
}
