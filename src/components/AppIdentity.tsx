import { Link } from "@tanstack/react-router";
import { SproutLogo } from "@/components/SproutLogo";
import { APP_INFO, formatRevision } from "@/lib/app-info";

/** Pied de page discret : droits, révision et lien vers la page À propos (#237). */
export function AppFooter() {
  return (
    <footer
      className="border-t px-6 py-4 text-[11px] font-mono text-muted-foreground"
      data-testid="app-footer"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2 sm:flex-row">
        <span>
          {APP_INFO.nom} · {APP_INFO.copyright}
        </span>
        <span className="flex items-center gap-3">
          <span title="Version et révision du code déployé">{formatRevision()}</span>
          <Link to="/a-propos" className="underline-offset-2 hover:text-primary hover:underline">
            À propos
          </Link>
        </span>
      </div>
    </footer>
  );
}

/** Bloc d'identité : logo, nom, sous-titre et révision. */
export function AppIdentity() {
  return (
    <div className="flex flex-col items-start gap-3">
      <SproutLogo size="lg" title={APP_INFO.nom} subtitle={APP_INFO.sousTitre} />
      <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
        {formatRevision()}
      </span>
    </div>
  );
}
