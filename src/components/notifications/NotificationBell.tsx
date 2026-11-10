import { useState } from "react";
import { Bell } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationList } from "@/components/notifications/NotificationList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

/** Plafond d'affichage du badge (« 9+ ») pour qu'il reste compact. */
export function formaterBadge(nonLues: number): string {
  return nonLues > 9 ? "9+" : String(nonLues);
}

/**
 * Cloche du centre de notifications (#245) : Popover sur desktop, Sheet sur mobile.
 * Le badge de comptage est statique (aucune animation) et suit le temps réel.
 * Elle n'est affichée que pour un utilisateur connecté.
 */
export function NotificationBell() {
  const isMobile = useIsMobile();
  const [ouvert, setOuvert] = useState(false);
  const n = useNotifications();

  if (!n.actif) return null;

  const libelle =
    n.nonLues > 0
      ? `Notifications, ${n.nonLues} non lue${n.nonLues > 1 ? "s" : ""}`
      : "Notifications";

  const bouton = (
    <button
      type="button"
      aria-label={libelle}
      data-testid="notification-bell"
      onClick={isMobile ? () => setOuvert(true) : undefined}
      className="relative flex h-8 w-8 items-center justify-center rounded border bg-background/60 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer max-md:h-11 max-md:w-11"
    >
      <Bell className="h-4 w-4" />
      {n.nonLues > 0 && (
        <span
          data-testid="notification-badge"
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {formaterBadge(n.nonLues)}
        </span>
      )}
    </button>
  );

  const liste = (
    <NotificationList
      notifications={n.notifications}
      nonLues={n.nonLues}
      chargement={n.chargement}
      erreur={n.erreur}
      onMarquerLue={n.marquerCommeLue}
      onToutMarquerLu={n.marquerToutesCommeLues}
    />
  );

  if (isMobile) {
    return (
      <>
        {bouton}
        <Sheet open={ouvert} onOpenChange={setOuvert}>
          <SheetContent side="right" className="w-[min(380px,100vw)] gap-0 p-0 sm:max-w-none">
            <SheetTitle className="border-b px-4 py-3 text-sm">Notifications</SheetTitle>
            <SheetDescription className="sr-only">
              Résultats de correction, messages du tuteur, échéances et invitations.
            </SheetDescription>
            {liste}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger asChild>{bouton}</PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <p className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Notifications
        </p>
        {liste}
      </PopoverContent>
    </Popover>
  );
}
