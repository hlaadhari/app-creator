import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  type AdminUser,
  type AdminMetrics,
  type AppRole,
  type SecurityTestItem,
  getAdminUsers,
  getAdminMetrics,
  modifierRoleUtilisateur,
  anonymiserDonneesEleve,
  getSecurityTestsMatrix,
  MOCK_ADMIN_USERS,
  MOCK_ADMIN_METRICS,
} from "@/lib/supabase/admin";
import { exercises } from "@/lib/exercises";
import { estModeDemo } from "@/lib/demo-mode";
import {
  controlesEnDirect,
  getEtatSysteme,
  mesurerLatenceEtHorloge,
  TOLERANCE_HORLOGE_SECONDES,
  type EtatSysteme,
  type MesureLatence,
} from "@/lib/supabase/system-health";
import { MAX_EXECUTION_TIME_MS, MAX_MEMORY_LIMIT_BYTES } from "@/lib/php/php-worker-core";
import {
  adminListerDemandesEnseignant,
  type DemandeEnseignant,
} from "@/lib/supabase/teacher-requests";
import { TeacherRequestsQueue } from "@/components/teacher/TeacherRequestsQueue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  GraduationCap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Search,
  Check,
  X,
  UserCheck,
  UserX,
  Lock,
  Database,
  FileCode,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { user, profile, role, authError, loading: authLoading } = useAuth();

  // Mode démo réservé au développement (ignoré en production).
  const [isDemo] = useState(estModeDemo);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics>(MOCK_ADMIN_METRICS);
  const [securityTests] = useState<SecurityTestItem[]>(getSecurityTestsMatrix());
  const [loadingData, setLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [demandes, setDemandes] = useState<DemandeEnseignant[]>([]);
  const [etatSysteme, setEtatSysteme] = useState<EtatSysteme | null>(null);
  const [mesure, setMesure] = useState<MesureLatence | null>(null);
  const [etatErreur, setEtatErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    titre: string;
    description: string;
    libelle: string;
    onConfirm: () => void;
  } | null>(null);

  const loadData = async () => {
    if (isDemo) {
      setUsers(MOCK_ADMIN_USERS);
      setMetrics(MOCK_ADMIN_METRICS);
      return;
    }

    if (!user) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      const [uList, m, dList] = await Promise.all([
        getAdminUsers(),
        getAdminMetrics(),
        adminListerDemandesEnseignant(),
      ]);
      setUsers(uList);
      setMetrics(m);
      setDemandes(dList);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Impossible de charger les comptes.");
    } finally {
      setLoadingData(false);
    }
    void chargerEtatSysteme();
  };

  // État réel de la base et latence : mesurés à chaque chargement, jamais écrits en dur.
  const chargerEtatSysteme = async () => {
    setEtatErreur(null);
    try {
      const [etat, latence] = await Promise.all([getEtatSysteme(), mesurerLatenceEtHorloge()]);
      setEtatSysteme(etat);
      setMesure(latence);
    } catch (e) {
      setEtatSysteme(null);
      setMesure(null);
      setEtatErreur(e instanceof Error ? e.message : "État du système indisponible.");
    }
  };

  useEffect(() => {
    if (isDemo || (user && role === "admin")) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, isDemo]);

  // Modification manuelle du rôle d'un utilisateur
  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (isDemo) {
      setUsers(
        users.map((u) =>
          u.id === userId
            ? {
                ...u,
                role: newRole,
                statutValidation: newRole === "enseignant" ? "valide" : "non_requis",
              }
            : u,
        ),
      );
      setActionMessage(`Rôle mis à jour vers "${newRole}" (Mode Démo).`);
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }

    if (newRole === "admin") {
      setConfirmation({
        titre: "Donner les droits d'administration ?",
        description:
          "Ce compte pourra gérer tous les utilisateurs, changer les rôles et anonymiser des élèves.",
        libelle: "Donner les droits admin",
        onConfirm: () => void appliquerRole(userId, newRole),
      });
      return;
    }

    await appliquerRole(userId, newRole);
  };

  const appliquerRole = async (userId: string, newRole: AppRole) => {
    const res = await modifierRoleUtilisateur(userId, newRole);
    if (res.success) {
      setActionMessage(`Rôle mis à jour vers "${newRole}".`);
      await loadData();
    } else {
      setActionMessage(res.error || "Erreur de modification du rôle.");
    }
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Anonymisation RGPD d'un élève
  const handleAnonymize = (userId: string) => {
    setConfirmation({
      titre: "Anonymiser ce profil élève ?",
      description:
        "Le nom, l'e-mail et l'accès de l'élève seront effacés définitivement (RGPD §17). Cette action est irréversible.",
      libelle: "Anonymiser définitivement",
      onConfirm: () => void appliquerAnonymisation(userId),
    });
  };

  const appliquerAnonymisation = async (userId: string) => {
    if (isDemo) {
      setUsers(
        users.map((u) =>
          u.id === userId
            ? { ...u, nom: "Anonyme", prenom: "Élève Supprimé", email: "anonyme@lycee.fr" }
            : u,
        ),
      );
      setActionMessage("Profil anonymisé conformément au droit à l'effacement RGPD (Mode Démo).");
      setTimeout(() => setActionMessage(null), 3500);
      return;
    }

    const res = await anonymiserDonneesEleve(userId);
    if (res.success) {
      setActionMessage("Profil élève anonymisé avec succès (RGPD §17).");
      await loadData();
    } else {
      setActionMessage(res.error || "Erreur lors de l'anonymisation.");
    }
    setTimeout(() => setActionMessage(null), 3500);
  };

  // Contrôles de sécurité vérifiés en direct dans la base (les autres tests relèvent de la CI)
  const controles = useMemo(
    () => (etatSysteme ? controlesEnDirect(etatSysteme) : []),
    [etatSysteme],
  );
  const controlesOk = controles.filter((c) => c.ok).length;
  const statutDirect = (code: string): "ok" | "echec" | "ci" => {
    const concernes = controles.filter((c) => c.codes.includes(code));
    if (concernes.length === 0) return "ci";
    return concernes.every((c) => c.ok) ? "ok" : "echec";
  };

  // Filtrage des utilisateurs
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      const matchSearch =
        u.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, searchQuery]);

  // Demandes enseignant en attente
  const pendingTeachers = useMemo(() => {
    return demandes.filter((d) => d.statut === "en_attente");
  }, [demandes]);

  // Écran de chargement initial
  if (authLoading && !isDemo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Vérification des privilèges administrateur...
      </div>
    );
  }

  // Contrôle d'accès strict (T-02/T-03)
  if (!isDemo && (!user || role !== "admin")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full border rounded-xl p-8 bg-card text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Accès Réservé à l'Administration</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {authError
              ? `Impossible de vérifier vos droits d'accès : ${authError}`
              : user
                ? `Votre compte connecté (${user.email}) possède le rôle "${role}". L'espace d'administration nécessite le rôle administrateur.`
                : "Vous devez être connecté avec un compte administrateur pour accéder à cette interface."}
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Retourner à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Barre supérieure Admin */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link
            to="/enseignant"
            search={{ demo: isDemo ? "true" : undefined }}
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Espace Enseignant
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-rose-500" />
            <h1 className="text-sm font-semibold tracking-tight">
              Panneau d'Administration Centrale
            </h1>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              isDemo
                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
            }`}
          >
            {isDemo ? "Mode Démonstration Admin" : "Super-Administrateur"}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Connecté :{" "}
            <strong className="text-foreground">
              {isDemo
                ? "Administrateur Système (Démo)"
                : `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() || user?.email || "Admin"}
            </strong>
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="h-8 text-xs gap-1.5"
            disabled={loadingData}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* Bannière d'alerte ou message d'action */}
      {actionMessage && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="bg-destructive/10 border-b border-destructive/20 px-6 py-2 text-xs text-destructive font-medium flex items-center gap-2"
        >
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Chargement des comptes impossible : {loadError}</span>
        </div>
      )}

      {/* Contenu principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Cartes Métriques Synthétiques */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">{metrics.totalUsers}</div>
                <div className="text-xs text-muted-foreground">Utilisateurs inscrits</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">
                  {
                    users.filter((u) => u.role === "enseignant" && u.statutValidation === "valide")
                      .length
                  }
                </div>
                <div className="text-xs text-muted-foreground">Enseignants certifiés</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">{pendingTeachers.length}</div>
                <div className="text-xs text-muted-foreground">Validations en attente</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold font-mono">
                  {etatSysteme ? `${controlesOk} / ${controles.length}` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">Contrôles de sécurité en direct</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Système d'onglets de gestion */}
        <Tabs defaultValue="utilisateurs" className="space-y-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="utilisateurs" className="gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>Utilisateurs & Rôles ({users.length})</span>
            </TabsTrigger>
            <TabsTrigger value="securite" className="gap-1.5 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Sécurité & RGPD (14 tests)</span>
            </TabsTrigger>
            <TabsTrigger value="supervision" className="gap-1.5 text-xs">
              <Activity className="w-3.5 h-3.5" />
              <span>Santé Système & Services</span>
            </TabsTrigger>
            <TabsTrigger value="sujets" className="gap-1.5 text-xs">
              <Award className="w-3.5 h-3.5" />
              <span>Catalogue & Immuabilité ({exercises.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Onglet 1 : Gestion des Utilisateurs et Validation Enseignants */}
          <TabsContent value="utilisateurs" className="space-y-4">
            {/* Alertes : Demandes Enseignant en attente */}
            <TeacherRequestsQueue
              demandes={demandes}
              onProcessed={(message) => {
                setActionMessage(message);
                void loadData();
                setTimeout(() => setActionMessage(null), 3500);
              }}
            />

            {/* Liste complète des utilisateurs */}
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
                <CardTitle className="text-sm font-semibold">
                  Répertoire de tous les comptes
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher nom, email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-64"
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-8 rounded border bg-background px-2 text-xs font-mono"
                  >
                    <option value="all">Tous les rôles</option>
                    <option value="eleve">Élèves</option>
                    <option value="enseignant">Enseignants</option>
                    <option value="admin">Administrateurs</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 border-y font-mono text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Utilisateur</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Rôle Actuel</th>
                      <th className="p-3">Validation Enseignant</th>
                      <th className="p-3">Date d'inscription</th>
                      <th className="p-3">Dernière connexion</th>
                      <th className="p-3 text-right">Actions Administrateur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          {u.prenom} {u.nom}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {u.email}
                          {u.emailConfirme === false && (
                            <span className="ml-2 text-[10px] text-amber-500">non confirmé</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              u.role === "admin"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : u.role === "enseignant"
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {u.role === "enseignant" ? (
                            u.statutValidation === "valide" ? (
                              <span className="text-emerald-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Validé
                              </span>
                            ) : (
                              <span className="text-amber-500 flex items-center gap-1 font-semibold">
                                <Clock className="w-3.5 h-3.5" />
                                En attente
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-[11px]">
                          {u.derniereConnexion
                            ? new Date(u.derniereConnexion).toLocaleString()
                            : "Jamais"}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as AppRole)}
                              disabled={u.anonymise || u.id === user?.id}
                              aria-label={`Rôle de ${u.prenom} ${u.nom}`}
                              title={
                                u.id === user?.id
                                  ? "Vous ne pouvez pas modifier votre propre rôle"
                                  : undefined
                              }
                              className="h-7 rounded border bg-background px-1.5 text-[11px] font-mono disabled:opacity-50"
                            >
                              <option value="eleve">Élève</option>
                              <option value="enseignant">Enseignant</option>
                              <option value="admin">Admin</option>
                            </select>

                            {u.anonymise ? (
                              <span className="px-2 text-[10px] text-muted-foreground">
                                Anonymisé
                              </span>
                            ) : (
                              u.role === "eleve" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAnonymize(u.id)}
                                  className="h-7 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                                  title="Anonymiser conformément au droit à l'effacement RGPD (§17)"
                                >
                                  RGPD Effacer
                                </Button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet 2 : Audit Sécurité & Conformité RGPD */}
          <TabsContent value="securite" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>
                        Matrice Officielle des 14 Tests Négatifs de Sécurité (T-01 à T-14)
                      </span>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Modèle de menace de docs/SECURITY.md. Les contrôles « direct » sont vérifiés
                      dans la base à l'affichage ; les autres tests sont exécutés par la CI.
                    </p>
                  </div>
                  <Badge
                    className={`font-mono text-xs ${
                      !etatSysteme
                        ? "bg-muted text-muted-foreground"
                        : controlesOk === controles.length
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    }`}
                  >
                    {etatSysteme
                      ? `${controlesOk} / ${controles.length} contrôles en direct OK`
                      : "Contrôles en direct indisponibles"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 border-y font-mono text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3 w-16">Code</th>
                      <th className="p-3">Intitulé du Test & Scénario d'Attaque</th>
                      <th className="p-3">Catégorie</th>
                      <th className="p-3">Criticité</th>
                      <th className="p-3">Mécanisme de Protection</th>
                      <th className="p-3 text-right">Vérification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {securityTests.map((t) => (
                      <tr key={t.code} className="hover:bg-muted/30">
                        <td className="p-3 font-bold text-primary">{t.code}</td>
                        <td className="p-3 font-sans font-medium text-foreground">{t.titre}</td>
                        <td className="p-3 text-muted-foreground text-[11px]">{t.categorie}</td>
                        <td className="p-3">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              t.criticite === "Bloquant"
                                ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}
                          >
                            {t.criticite}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-xs text-muted-foreground">{t.detail}</td>
                        <td className="p-3 text-right">
                          {statutDirect(t.code) === "ci" ? (
                            <span
                              title="Couvert par la suite de tests automatisés (GitHub Actions) ; non vérifiable en direct depuis cette page."
                              className="inline-flex items-center gap-1 text-muted-foreground font-bold text-[11px] bg-muted border px-2 py-0.5 rounded"
                            >
                              CI
                            </span>
                          ) : statutDirect(t.code) === "ok" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500 font-bold text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" />
                              OK en direct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-500 font-bold text-[11px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3" />
                              ÉCHEC
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t p-4 space-y-1.5 text-xs">
                  <div className="font-mono uppercase text-[10px] text-muted-foreground">
                    Contrôles en direct
                  </div>
                  {etatErreur && (
                    <p role="alert" className="text-destructive">
                      Contrôles indisponibles : {etatErreur}
                    </p>
                  )}
                  {controles.map((c) => (
                    <div key={c.libelle} className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-2 w-2 rounded-full shrink-0 ${c.ok ? "bg-emerald-500" : "bg-rose-500"}`}
                      />
                      <span>
                        <strong>{c.libelle}</strong> ({c.codes.join(", ")}) :{" "}
                        <span className="text-muted-foreground">{c.detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet 3 : Supervision Système & Services */}
          <TabsContent value="supervision" className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-primary" />
                      Base de Données Supabase
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !etatSysteme
                          ? "bg-muted-foreground/40"
                          : controlesOk === controles.length
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  {etatErreur && (
                    <p role="alert" className="text-destructive">
                      Mesures indisponibles : {etatErreur}
                    </p>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tables avec RLS :</span>
                    <strong className="text-foreground font-mono">
                      {etatSysteme
                        ? `${etatSysteme.tables - etatSysteme.tablesSansRls.length} / ${etatSysteme.tables}`
                        : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Droits clients sur solutions :</span>
                    <strong
                      className={`font-mono ${etatSysteme && etatSysteme.droitsClientsCorriges > 0 ? "text-rose-500" : "text-foreground"}`}
                    >
                      {etatSysteme ? `${etatSysteme.droitsClientsCorriges} (T-04)` : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Latence (médiane de 3) :</span>
                    <strong className="text-foreground font-mono">
                      {mesure ? `${mesure.latenceMs} ms` : "—"}
                    </strong>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCode className="w-4 h-4 text-indigo-500" />
                      Moteur PHP 8.2 WASM
                    </span>
                    <span className="text-[10px] normal-case text-muted-foreground">
                      configuration
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Watchdog d'exécution :</span>
                    <strong className="text-foreground font-mono">
                      {MAX_EXECUTION_TIME_MS} ms max (T-10)
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plafond mémoire :</span>
                    <strong className="text-foreground font-mono">
                      {Math.round(MAX_MEMORY_LIMIT_BYTES / (1024 * 1024))} Mo / élève
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confinement réseau :</span>
                    <strong className="text-foreground">Bac à sable (test T-11 en CI)</strong>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-mono uppercase text-muted-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Horloge Serveur NTP (T-08)
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full ${
                        !mesure
                          ? "bg-muted-foreground/40"
                          : Math.abs(mesure.ecartHorlogeSecondes) <= TOLERANCE_HORLOGE_SECONDES
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                      }`}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heure du serveur :</span>
                    <strong className="text-foreground font-mono">
                      {mesure ? new Date(mesure.horlogeServeur).toLocaleTimeString() : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Écart navigateur / serveur :</span>
                    <strong className="text-foreground font-mono">
                      {mesure
                        ? `${mesure.ecartHorlogeSecondes > 0 ? "+" : ""}${mesure.ecartHorlogeSecondes} s`
                        : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Alerte au-delà de :</span>
                    <strong className="text-foreground font-mono">
                      ± {TOLERANCE_HORLOGE_SECONDES} secondes
                    </strong>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Onglet 4 : Catalogue des Sujets & Immuabilité */}
          <TabsContent value="sujets" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span>Registre des Sujets Déployés et Versions Scellées</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/50 border-y font-mono text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="p-3">ID Sujet</th>
                      <th className="p-3">Titre du Sujet</th>
                      <th className="p-3">Module</th>
                      <th className="p-3">Niveau</th>
                      <th className="p-3">Durée</th>
                      <th className="p-3">Mode Examen</th>
                      <th className="p-3 text-right">Garantie Immuabilité</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono">
                    {exercises.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30">
                        <td className="p-3 font-bold text-primary">{e.id}</td>
                        <td className="p-3 font-sans font-medium">{e.title}</td>
                        <td className="p-3 text-muted-foreground">{e.module || "Initiation"}</td>
                        <td className="p-3">{e.level}</td>
                        <td className="p-3">{e.dureeMinutes || 20} min</td>
                        <td className="p-3">
                          {e.examMode ? (
                            <span className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-500 font-semibold">
                              Examen Blanc
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <span className="inline-flex items-center gap-1 text-emerald-500 text-[11px] font-semibold">
                            <Lock className="w-3 h-3" />
                            Version Scellée (T-13)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation?.titre}</AlertDialogTitle>
            <AlertDialogDescription>{confirmation?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmation?.onConfirm();
                setConfirmation(null);
              }}
            >
              {confirmation?.libelle}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
