import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  User,
  Users,
  GraduationCap,
  Shield,
  Lock,
  TrendingUp,
  BookOpen,
  Calendar,
  LogOut,
  RefreshCw,
  ChevronDown,
  LayoutGrid,
  Eye,
  Check,
} from "lucide-react";
import {
  useAuth,
  getUserDisplayName,
  getUserInitials,
  getRoleBadgeInfo,
} from "@/lib/supabase/auth";
import { UserProfileDialog, type ProfileDialogTab } from "@/components/UserProfileDialog";
import { ProgressionModal } from "@/components/competences/ProgressionModal";

export interface UserProfileMenuProps {
  onClassesChanged?: (() => void) | undefined;
}

export function UserProfileMenu({ onClassesChanged }: UserProfileMenuProps) {
  const {
    user,
    profile,
    role,
    realRole,
    isRoleSimulated,
    setPreviewRole,
    loading,
    signOut,
    refreshProfile,
  } = useAuth();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileDialogTab, setProfileDialogTab] = useState<ProfileDialogTab>("profil");
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!user) return null;

  const displayName = getUserDisplayName(profile, user);
  const initials = getUserInitials(profile, user);
  // Ne jamais afficher un badge « Élève » par défaut tant que le rôle n'est pas vérifié (#189).
  const roleInfo = role
    ? getRoleBadgeInfo(role)
    : {
        label: loading ? "…" : "Compte",
        badgeClass: "bg-muted text-muted-foreground border-border",
        description: "Vérification des droits en cours…",
      };

  const openProfileTab = (tab: ProfileDialogTab) => {
    setProfileDialogTab(tab);
    setProfileDialogOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Menu profil utilisateur"
            data-testid="user-profile-menu-trigger"
            className="gap-2 pl-1.5 pr-2.5 h-8 text-xs border-border hover:bg-accent/50 cursor-pointer"
          >
            <span
              className="h-6 w-6 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold text-[10px] shrink-0"
              aria-hidden="true"
            >
              {initials}
            </span>
            <span className="font-mono text-xs text-foreground truncate max-w-[140px]">
              {displayName}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] font-mono uppercase font-semibold shrink-0 ${roleInfo.badgeClass}`}
            >
              {roleInfo.label}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center gap-2.5 py-0.5">
              <div
                className="h-9 w-9 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold text-xs shrink-0"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <span
                    className={`rounded border px-1.5 py-0.2 text-[9px] font-mono uppercase font-semibold shrink-0 ${roleInfo.badgeClass}`}
                  >
                    {roleInfo.label}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          {/* Section 1 : Mon Compte & Pédagogie */}
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => openProfileTab("profil")}
              className="text-xs gap-2 cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-primary" />
              <span>Mon profil & identité</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => openProfileTab("classes")}
              className="text-xs gap-2 cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Mes classes STI</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => setProgressionOpen(true)}
              className="text-xs gap-2 cursor-pointer"
            >
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>Mon bilan de compétences</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => openProfileTab("habilitation")}
              className="text-xs gap-2 cursor-pointer"
            >
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              <span>{role === "eleve" ? "Demander l'accès enseignant" : "Mon habilitation"}</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() => openProfileTab("securite")}
              className="text-xs gap-2 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>Sécurité & stockage local</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Section 2 : Navigation Rapide */}
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
              <a href="/">
                <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Catalogue des sujets</span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
              <a href="/cours">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Mémento & Cours STI</span>
              </a>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
              <a href="/calendrier">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Planning & Postes TP</span>
              </a>
            </DropdownMenuItem>

            {(role === "enseignant" || role === "admin") && (
              <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
                <a href="/enseignant">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-primary">Espace Enseignant</span>
                </a>
              </DropdownMenuItem>
            )}

            {role === "admin" && (
              <DropdownMenuItem asChild className="text-xs gap-2 cursor-pointer">
                <a href="/admin">
                  <Shield className="h-3.5 w-3.5 text-rose-500" />
                  <span className="font-medium text-rose-500">Administration Centrale</span>
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          {realRole === "admin" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup data-testid="role-preview-section">
                <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground py-1">
                  <Eye className="h-3.5 w-3.5 text-amber-500" />
                  <span>Prévisualiser en tant que</span>
                </DropdownMenuLabel>

                <DropdownMenuItem
                  data-testid="role-preview-option-eleve"
                  onSelect={() => setPreviewRole("eleve")}
                  className="text-xs gap-2 justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Élève</span>
                  </span>
                  {role === "eleve" && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="role-preview-option-enseignant"
                  onSelect={() => setPreviewRole("enseignant")}
                  className="text-xs gap-2 justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span>Enseignant</span>
                  </span>
                  {role === "enseignant" && <Check className="h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>

                <DropdownMenuItem
                  data-testid="role-preview-option-admin"
                  onSelect={() => setPreviewRole(null)}
                  className="text-xs gap-2 justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Admin (rôle réel)</span>
                  </span>
                  {!isRoleSimulated && <Check className="h-3.5 w-3.5 text-rose-500" />}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Section 3 : Rafraîchissement & Déconnexion */}
          <DropdownMenuItem
            onSelect={() => void handleRefresh()}
            disabled={refreshing}
            className="text-xs gap-2 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Actualiser mes droits</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => void signOut()}
            className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        defaultTab={profileDialogTab}
        onClassesChanged={onClassesChanged}
      />

      <ProgressionModal open={progressionOpen} onOpenChange={setProgressionOpen} hideTrigger />
    </>
  );
}
