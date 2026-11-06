import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Users,
  GraduationCap,
  Shield,
  Lock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  LogOut,
  Clock,
  Mail,
} from "lucide-react";
import {
  useAuth,
  getUserDisplayName,
  getUserInitials,
  getRoleBadgeInfo,
} from "@/lib/supabase/auth";
import {
  getMesClasses,
  rejoindreClasse,
  quitterClasse,
  checkRateLimit,
  type ClassInfo,
} from "@/lib/supabase/classes";
import { getAllBuffers } from "@/lib/storage/indexeddb";
import { TeacherAccessRequest } from "@/components/teacher/TeacherAccessRequest";

export type ProfileDialogTab = "profil" | "classes" | "habilitation" | "securite";

export interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: ProfileDialogTab | undefined;
  onClassesChanged?: (() => void) | undefined;
}

export function UserProfileDialog({
  open,
  onOpenChange,
  defaultTab = "profil",
  onClassesChanged,
}: UserProfileDialogProps) {
  const { user, profile, role, authError, refreshProfile, updateProfile, updatePassword, signOut } =
    useAuth();

  const [activeTab, setActiveTab] = useState<ProfileDialogTab>(defaultTab);

  // États Onglet Profil
  const [prenom, setPrenom] = useState(profile?.prenom ?? "");
  const [nom, setNom] = useState(profile?.nom ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [refreshingRole, setRefreshingRole] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // États Onglet Classes
  const [mesClasses, setMesClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);
  const [leavingClassId, setLeavingClassId] = useState<string | null>(null);
  const [classSuccess, setClassSuccess] = useState<string | null>(null);
  const [classError, setClassError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // États Onglet Sécurité & Données locales
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [localBuffersCount, setLocalBuffersCount] = useState<number>(0);
  const [lastLocalSave, setLastLocalSave] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  useEffect(() => {
    setPrenom(profile?.prenom ?? "");
    setNom(profile?.nom ?? "");
  }, [profile]);

  // Décompte rate-limit anti brute-force (T-05)
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const chargerClassesEtStockage = useCallback(async () => {
    if (!user) return;
    setLoadingClasses(true);
    try {
      const [classesList, buffers] = await Promise.all([
        getMesClasses(),
        getAllBuffers().catch(() => []),
      ]);
      setMesClasses(classesList);
      setLocalBuffersCount(buffers.length);
      if (buffers.length > 0) {
        const latest = Math.max(...buffers.map((b) => b.lastLocalSaveAt || 0));
        if (latest > 0) {
          setLastLocalSave(new Date(latest).toLocaleString("fr-FR"));
        }
      } else {
        setLastLocalSave(null);
      }
      const rl = checkRateLimit();
      if (!rl.allowed) setCooldown(rl.retryAfterSeconds);
    } finally {
      setLoadingClasses(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      setProfileSuccess(null);
      setProfileError(null);
      setClassSuccess(null);
      setClassError(null);
      setPasswordSuccess(null);
      setPasswordError(null);
      void chargerClassesEtStockage();
    }
  }, [open, user, chargerClassesEtStockage]);

  if (!user) return null;

  const displayName = getUserDisplayName(profile, user);
  const initials = getUserInitials(profile, user);
  const roleInfo = getRoleBadgeInfo(role);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    const { error } = await updateProfile(nom, prenom);
    setSavingProfile(false);

    if (error) {
      setProfileError(error.message);
    } else {
      setProfileSuccess("Votre profil a été mis à jour avec succès.");
    }
  };

  const handleRefreshRights = async () => {
    setRefreshingRole(true);
    setProfileSuccess(null);
    setProfileError(null);
    try {
      await refreshProfile();
      setProfileSuccess("Vos droits et informations de profil ont été synchronisés.");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Impossible de rafraîchir vos droits.");
    } finally {
      setRefreshingRole(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setJoiningClass(true);
    setClassError(null);
    setClassSuccess(null);

    const res = await rejoindreClasse(inviteCode);
    setJoiningClass(false);

    if (res.success) {
      setClassSuccess(`Vous avez rejoint la classe « ${res.className || "STI"} » avec succès.`);
      setInviteCode("");
      const updated = await getMesClasses();
      setMesClasses(updated);
      onClassesChanged?.();
    } else {
      setClassError(res.error || "Impossible de rejoindre cette classe.");
      if (res.retryAfterSeconds && res.retryAfterSeconds > 0) {
        setCooldown(res.retryAfterSeconds);
      }
    }
  };

  const handleLeaveClass = async (cls: ClassInfo) => {
    setLeavingClassId(cls.id);
    setClassError(null);
    setClassSuccess(null);

    const res = await quitterClasse(cls.id);
    setLeavingClassId(null);

    if (res.success) {
      setClassSuccess(`Vous avez quitté la classe « ${cls.nom} ».`);
      const updated = await getMesClasses();
      setMesClasses(updated);
      onClassesChanged?.();
    } else {
      setClassError(res.error || "Impossible de quitter la classe.");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setSavingPassword(true);
    const { error } = await updatePassword(newPassword);
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess("Votre mot de passe a été modifié avec succès.");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-full bg-primary/15 border border-primary/30 text-primary flex items-center justify-center font-mono font-bold text-sm shrink-0"
                aria-hidden="true"
              >
                {initials}
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>{displayName}</span>
                  <span
                    className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${roleInfo.badgeClass}`}
                  >
                    {roleInfo.label}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <span>{user.email}</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {authError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Erreur de lecture des droits : {authError}</span>
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ProfileDialogTab)}
          className="mt-2"
        >
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="profil" className="text-xs gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>Profil</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>Classes ({mesClasses.length})</span>
            </TabsTrigger>
            <TabsTrigger value="habilitation" className="text-xs gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Habilitation</span>
            </TabsTrigger>
            <TabsTrigger value="securite" className="text-xs gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>Sécurité</span>
            </TabsTrigger>
          </TabsList>

          {/* ONGLET 1 : IDENTITÉ & PROFIL */}
          <TabsContent value="profil" className="space-y-4 pt-4">
            {profileSuccess && (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-prenom" className="text-xs">
                    Prénom
                  </Label>
                  <Input
                    id="profile-prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Votre prénom"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-nom" className="text-xs">
                    Nom
                  </Label>
                  <Input
                    id="profile-nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Votre nom"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-email-readonly" className="text-xs text-muted-foreground">
                  Adresse e-mail de connexion (identifiant vérifié)
                </Label>
                <Input
                  id="profile-email-readonly"
                  value={user.email ?? ""}
                  disabled
                  readOnly
                  className="bg-muted/50 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleRefreshRights()}
                  disabled={refreshingRole}
                  className="text-xs gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingRole ? "animate-spin" : ""}`} />
                  <span>Actualiser mes droits</span>
                </Button>

                <Button type="submit" size="sm" disabled={savingProfile} className="text-xs">
                  {savingProfile ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>

            <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Fermer la session sur ce poste</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  onOpenChange(false);
                }}
                className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Se déconnecter</span>
              </Button>
            </div>
          </TabsContent>

          {/* ONGLET 2 : MES CLASSES STI */}
          <TabsContent value="classes" className="space-y-4 pt-4">
            {classSuccess && (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{classSuccess}</span>
              </div>
            )}

            {classError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{classError}</span>
              </div>
            )}

            {cooldown > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Clock className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
                <span>
                  Protection anti brute-force active : réessayez dans <strong>{cooldown}s</strong>.
                </span>
              </div>
            )}

            <form onSubmit={handleJoinClass} className="rounded-lg border bg-card p-3.5 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="profile-class-code" className="text-xs font-semibold">
                  Rejoindre une nouvelle classe avec un code d'invitation
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Saisissez le code communiqué par votre enseignant (ex. STI-7842).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <KeyRound className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-class-code"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="STI-XXXX"
                    className="pl-9 font-mono tracking-widest uppercase font-semibold text-xs h-9"
                    maxLength={12}
                    disabled={joiningClass || cooldown > 0}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={joiningClass || cooldown > 0 || inviteCode.trim().length < 4}
                  className="text-xs h-9"
                >
                  {joiningClass ? "Validation…" : "Rejoindre"}
                </Button>
              </div>
            </form>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Mes classes actives ({mesClasses.length})
                </h4>
              </div>

              {loadingClasses ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Chargement de vos classes…
                </p>
              ) : mesClasses.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Vous n'êtes inscrit dans aucune classe pour le moment.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mesClasses.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg border bg-card p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate">{c.nom}</span>
                          <span className="font-mono text-[10px] text-muted-foreground border px-1.5 py-0.5 rounded">
                            {c.annee}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Inscrit le {new Date(c.joinedAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={leavingClassId === c.id}
                        onClick={() => void handleLeaveClass(c)}
                        className="h-7 text-[11px] text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0"
                      >
                        {leavingClassId === c.id ? "Retrait…" : "Quitter"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ONGLET 3 : HABILITATION & ACCÈS ENSEIGNANT */}
          <TabsContent value="habilitation" className="space-y-4 pt-4">
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Niveau d'habilitation actuel</span>
                </span>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${roleInfo.badgeClass}`}
                >
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {roleInfo.description}
              </p>
            </div>

            {role === "eleve" ? (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>Vous êtes enseignant d'informatique (STI) ?</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Déposez une demande d'habilitation ci-dessous pour débloquer la création de
                    classes, le Studio de sujets et la supervision des copies.
                  </p>
                </div>
                <TeacherAccessRequest />
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Votre compte dispose des privilèges{" "}
                    {role === "admin" ? "Administrateur & Enseignant" : "Enseignant certifié"}.
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Vous avez un accès complet au tableau de bord enseignant, au Studio de sujets et à
                  la gestion des séances de TP.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ONGLET 4 : SÉCURITÉ & DONNÉES LOCALES */}
          <TabsContent value="securite" className="space-y-4 pt-4">
            {passwordSuccess && (
              <div
                role="status"
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form
              onSubmit={handleUpdatePassword}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>Modifier mon mot de passe</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-new-password" className="text-xs">
                    Nouveau mot de passe (6 car. min)
                  </Label>
                  <Input
                    id="profile-new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••"
                    minLength={6}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-confirm-password" className="text-xs">
                    Confirmer le mot de passe
                  </Label>
                  <Input
                    id="profile-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={savingPassword} className="text-xs">
                  {savingPassword ? "Mise à jour…" : "Mettre à jour le mot de passe"}
                </Button>
              </div>
            </form>

            <div className="rounded-lg border bg-card p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-primary" />
                  <span>Tampon de sauvegarde locale (IndexedDB)</span>
                </span>
                <span className="font-mono text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  {localBuffersCount} sujet{localBuffersCount > 1 ? "s" : ""} en cache
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Conformément au principe « Ne jamais perdre le travail d'un élève », vos fichiers de
                code sont sauvegardés en continu dans le tampon local{" "}
                <code className="font-mono text-[11px]">labo_sti_buffer</code> avant synchronisation
                serveur.
              </p>
              {lastLocalSave && (
                <p className="text-[11px] font-mono text-muted-foreground">
                  Dernière écriture locale : {lastLocalSave}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
