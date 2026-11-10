import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, Calendar, GraduationCap, LayoutGrid, Shield } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { SproutLogo } from "@/components/SproutLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/supabase/auth";

export const MAIN_CONTENT_ID = "contenu-principal";

export type AppNavKey = "catalogue" | "cours" | "calendrier" | "enseignant" | "admin";

interface AppHeaderProps {
  /** Page courante : son lien de navigation est marqué `aria-current="page"`. */
  current?: AppNavKey;
  /** Sous-titre affiché sous le logo. */
  subtitle?: string;
  /** Fil d'Ariane ou titre de la page, à droite du logo. */
  breadcrumb?: ReactNode;
  /** Zone centrale (chrono d'examen, sélecteur de mode…). */
  center?: ReactNode;
  /** Actions propres à la page, avant la navigation. */
  actions?: ReactNode;
  /** Contenu avant le logo (ex. bouton de menu mobile). */
  leading?: ReactNode;
  /** Mode démonstration : liens enseignant/admin visibles et menu profil masqué. */
  demo?: boolean;
  /** Remplace le menu profil (ex. rechargement des classes après connexion). */
  authSlot?: ReactNode;
  /** Masque la navigation globale (workspace d'examen). */
  hideNav?: boolean;
}

interface NavLinkSpec {
  key: AppNavKey;
  to: "/" | "/cours" | "/calendrier" | "/enseignant" | "/admin";
  label: string;
  ariaLabel: string;
  icon: ReactNode;
  tone: "neutral" | "primary" | "danger";
}

const TONE_CLASSES: Record<NavLinkSpec["tone"], string> = {
  neutral: "text-foreground border-border hover:bg-accent/40",
  primary: "text-primary border-primary/30 hover:bg-primary/10",
  danger: "text-rose-500 border-rose-500/30 hover:bg-rose-500/10",
};

/**
 * En-tête unique de l'application (#241) : hauteur h-11, padding px-4,
 * repère `banner`, lien d'évitement et navigation selon le rôle.
 */
export function AppHeader({
  current,
  subtitle,
  breadcrumb,
  center,
  actions,
  leading,
  demo = false,
  authSlot,
  hideNav = false,
}: AppHeaderProps) {
  const { role } = useAuth();
  const isTeacher = demo || role === "enseignant" || role === "admin";
  const isAdmin = demo || role === "admin";

  const links: NavLinkSpec[] = [
    {
      key: "catalogue",
      to: "/",
      label: "Sujets",
      ariaLabel: "Catalogue des sujets",
      icon: <LayoutGrid className="h-4 w-4 text-primary" />,
      tone: "neutral",
    },
    {
      key: "cours",
      to: "/cours",
      label: "Mémento STI",
      ariaLabel: "Mémento STI",
      icon: <BookOpen className="h-4 w-4 text-primary" />,
      tone: "neutral",
    },
    {
      key: "calendrier",
      to: "/calendrier",
      label: "Séances TP",
      ariaLabel: "Planning et Postes TP",
      icon: <Calendar className="h-4 w-4 text-primary" />,
      tone: "neutral",
    },
  ];
  if (isTeacher) {
    links.push({
      key: "enseignant",
      to: "/enseignant",
      label: "Espace Enseignant",
      ariaLabel: "Espace Enseignant",
      icon: <GraduationCap className="h-4 w-4" />,
      tone: "primary",
    });
  }
  if (isAdmin) {
    links.push({
      key: "admin",
      to: "/admin",
      label: "Administration",
      ariaLabel: "Administration",
      icon: <Shield className="h-4 w-4" />,
      tone: "danger",
    });
  }

  return (
    <>
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-xs focus:text-primary-foreground"
      >
        Aller au contenu
      </a>
      <header
        role="banner"
        className="flex h-11 shrink-0 items-center justify-between gap-3 border-b bg-panel px-4 select-none"
      >
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <Link to="/" className="shrink-0 hover:opacity-85 transition-opacity">
            <SproutLogo size="sm" {...(subtitle ? { subtitle } : {})} />
          </Link>
          {breadcrumb && (
            <div className="flex min-w-0 items-center gap-2 text-xs">{breadcrumb}</div>
          )}
        </div>

        {center && <div className="flex min-w-0 items-center justify-center">{center}</div>}

        <div className="flex shrink-0 items-center gap-2 text-xs">
          {actions}
          {!hideNav && (
            <nav aria-label="Navigation principale" className="flex items-center gap-1.5">
              {links.map((l) => (
                <Link
                  key={l.key}
                  to={l.to}
                  {...(l.to === "/enseignant" || l.to === "/admin"
                    ? demo
                      ? { search: { demo: "true" } }
                      : {}
                    : {})}
                  aria-current={current === l.key ? "page" : undefined}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={l.ariaLabel}
                    className={`h-8 gap-1.5 text-xs ${TONE_CLASSES[l.tone]} ${
                      current === l.key ? "bg-accent/60 font-semibold" : ""
                    }`}
                  >
                    {l.icon}
                    <span className="hidden lg:inline">{l.label}</span>
                  </Button>
                </Link>
              ))}
            </nav>
          )}
          {/* Emplacement réservé à la cloche de notifications (#245) */}
          <div data-slot="notifications" className="contents" />
          {authSlot ?? (demo ? null : <AuthModal />)}
        </div>
      </header>
    </>
  );
}
