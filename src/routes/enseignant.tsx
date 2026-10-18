import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import {
  type TeacherClass,
  type TeacherClassMember,
  type ClassInvitationRecord,
  type StudentFile,
  getTeacherClasses,
  createTeacherClass,
  getClassStudentsProgress,
  getClassInvitations,
  getStudentCopyFiles,
  exporterResultatsCsv,
} from "@/lib/supabase/teacher";
import { StudentProgressTable } from "@/components/teacher/StudentProgressTable";
import { StudentCopyModal } from "@/components/teacher/StudentCopyModal";
import { InvitationsManager } from "@/components/teacher/InvitationsManager";
import { SubjectStudioTab } from "@/components/teacher/SubjectStudioTab";
import { ContestationsManager } from "@/components/teacher/ContestationsManager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap,
  Users,
  Award,
  AlertTriangle,
  Plus,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  FolderOpen,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/enseignant")({
  component: TeacherDashboardPage,
});

const DEMO_CLASSES: TeacherClass[] = [
  {
    id: "demo-cls-1",
    nom: "Terminale STI2D - Groupe 1",
    annee: "2026-2027",
    archivee: false,
    created_at: new Date().toISOString(),
    members_count: 24,
    assigned_subjects_count: 3,
  },
  {
    id: "demo-cls-2",
    nom: "Terminale STI2D - Groupe 2",
    annee: "2026-2027",
    archivee: false,
    created_at: new Date().toISOString(),
    members_count: 22,
    assigned_subjects_count: 2,
  },
];

const DEMO_STUDENTS: TeacherClassMember[] = [
  {
    eleve_id: "demo-s1",
    nom: "Bernard",
    prenom: "Lucas",
    score_formatif: 90,
    projet_statut: "rendu",
    criteres_reussis: 6,
    total_criteres: 6,
    joined_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    derniere_activite: new Date().toISOString(),
    points_faibles: [],
  },
  {
    eleve_id: "demo-s2",
    nom: "Khelifi",
    prenom: "Inès",
    score_formatif: 70,
    projet_statut: "en_cours",
    criteres_reussis: 4,
    total_criteres: 6,
    joined_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    derniere_activite: new Date().toISOString(),
    points_faibles: ["Contrôle de saisie CIN (8 chiffres)"],
  },
  {
    eleve_id: "demo-s3",
    nom: "Zitouni",
    prenom: "Mehdi",
    score_formatif: 85,
    projet_statut: "rendu",
    criteres_reussis: 5,
    total_criteres: 6,
    joined_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    derniere_activite: new Date().toISOString(),
    points_faibles: [],
  },
  {
    eleve_id: "demo-s4",
    nom: "Moreau",
    prenom: "Camille",
    score_formatif: 40,
    projet_statut: "en_cours",
    criteres_reussis: 2,
    total_criteres: 6,
    joined_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    derniere_activite: new Date().toISOString(),
    points_faibles: ["Syntaxe requête SQL JOIN", "Sélection d'élément DOM"],
  },
];

const DEMO_INVITATIONS: ClassInvitationRecord[] = [
  {
    id: "demo-inv-1",
    class_id: "demo-cls-1",
    code: "STI-7842",
    expire_le: new Date(Date.now() + 86400000 * 30).toISOString(),
    utilisations_max: 30,
    nb_utilisations: 4,
    revoque: false,
    created_at: new Date().toISOString(),
  },
];

const DEMO_FILES: StudentFile[] = [
  {
    id: "demo-f1",
    chemin: "index.html",
    contenu: `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Laboratoire STI - Copie Élève</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <article class="carte">\n    <h1>TP Synthèse Don Lycée</h1>\n    <p>Travail réalisé par l'élève en salle de TP.</p>\n  </article>\n  <script src="script.js"></script>\n</body>\n</html>`,
    rev: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-f2",
    chemin: "style.css",
    contenu: `body {\n  font-family: sans-serif;\n  background-color: #f8fafc;\n}\n.carte {\n  border: 2px solid #0066cc;\n  border-radius: 8px;\n  padding: 16px;\n}`,
    rev: 1,
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-f3",
    chemin: "script.js",
    contenu: `console.log("Contrôle de validation chargé pour vérification enseignant.");`,
    rev: 1,
    updated_at: new Date().toISOString(),
  },
];

function TeacherDashboardPage() {
  const { user, profile, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isDemo, setIsDemo] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("demo") === "true";
    }
    return false;
  });

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherClassMember[]>([]);
  const [invitations, setInvitations] = useState<ClassInvitationRecord[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassError, setNewClassError] = useState<string | null>(null);

  // Modal de consultation de la copie élève en lecture seule
  const [inspectingStudent, setInspectingStudent] = useState<TeacherClassMember | null>(null);
  const [inspectingFiles, setInspectingFiles] = useState<StudentFile[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);

  // Charger les classes de l'enseignant
  const loadClasses = async () => {
    if (isDemo) {
      setClasses(DEMO_CLASSES);
      if (!selectedClassId) setSelectedClassId("demo-cls-1");
      setStudents(DEMO_STUDENTS);
      setInvitations(DEMO_INVITATIONS);
      return;
    }

    if (!user) return;
    setLoadingData(true);
    const cls = await getTeacherClasses(user.id);
    setClasses(cls);
    if (cls.length > 0 && !selectedClassId) {
      const firstId = cls[0]?.id;
      if (firstId) setSelectedClassId(firstId);
    }
    setLoadingData(false);
  };

  // Charger les données de la classe sélectionnée
  const loadClassDetails = async (classId: string) => {
    if (isDemo) {
      setStudents(DEMO_STUDENTS);
      setInvitations(DEMO_INVITATIONS);
      return;
    }

    setLoadingData(true);
    const [progress, invs] = await Promise.all([
      getClassStudentsProgress(classId),
      getClassInvitations(classId),
    ]);
    setStudents(progress);
    setInvitations(invs);
    setLoadingData(false);
  };

  useEffect(() => {
    if (isDemo || (user && (role === "enseignant" || role === "admin"))) {
      loadClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, isDemo]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassDetails(selectedClassId);
    }
  }, [selectedClassId, isDemo]);

  // Création d'une nouvelle classe
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      const newCls: TeacherClass = {
        id: `demo-cls-${Date.now()}`,
        nom: newClassName || "Nouvelle Classe STI",
        annee: "2026-2027",
        archivee: false,
        created_at: new Date().toISOString(),
        members_count: 0,
        assigned_subjects_count: 0,
      };
      setClasses([...classes, newCls]);
      setSelectedClassId(newCls.id);
      setNewClassName("");
      setIsCreatingClass(false);
      return;
    }

    if (!user) return;
    setNewClassError(null);

    const res = await createTeacherClass(user.id, newClassName);
    if (res.success && res.classId) {
      setNewClassName("");
      setIsCreatingClass(false);
      await loadClasses();
      setSelectedClassId(res.classId);
    } else {
      setNewClassError(res.error || "Impossible de créer la classe.");
    }
  };

  // Inspection de la copie élève
  const handleInspectCopy = async (student: TeacherClassMember) => {
    setInspectingStudent(student);
    setLoadingCopy(true);
    if (isDemo) {
      setInspectingFiles(DEMO_FILES);
      setLoadingCopy(false);
      return;
    }
    const files = await getStudentCopyFiles(student.eleve_id);
    setInspectingFiles(files);
    setLoadingCopy(false);
  };

  // Export CSV
  const handleExportCsv = () => {
    const activeClass = classes.find((c) => c.id === selectedClassId);
    const nomClasse = activeClass?.nom || "classe";
    const csvData = exporterResultatsCsv(students, nomClasse);

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `resultats_${nomClasse.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Écran de chargement initial d'authentification
  if (authLoading && !isDemo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Vérification des droits d'accès enseignant...
      </div>
    );
  }

  // 2. Contrôle d'accès strict (T-02, PRD F-01) avec proposition de Mode Démo
  if (!isDemo && (!user || (role !== "enseignant" && role !== "admin"))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md w-full border rounded-xl p-8 bg-card text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Accès Réservé aux Enseignants</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'espace de supervision de classe est restreint aux comptes enseignants validés par
            l'administration (T-02, T-03).
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => {
                setIsDemo(true);
                loadClasses();
              }}
              className="w-full bg-primary text-primary-foreground text-xs font-medium h-9"
            >
              Explorer en Mode Démo Enseignant
            </Button>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted transition-colors gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Retourner à l'espace élève
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeClass = classes.find((c) => c.id === selectedClassId);

  // Calcul des métriques globales
  const totalEleves = students.length;
  const moyenneClasse =
    totalEleves > 0
      ? Math.round(
          students.reduce((acc, curr) => acc + (curr.score_formatif || 0), 0) / totalEleves,
        )
      : 0;
  const elevesEnDifficulte = students.filter(
    (s) => s.points_faibles && s.points_faibles.length > 0,
  ).length;
  const copiesRendues = students.filter((s) => s.projet_statut === "rendu").length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Barre supérieure Enseignant */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Espace élève
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">Tableau de Bord Enseignant</h1>
          </div>
          <Badge
            variant="outline"
            className={`text-[10px] ${isDemo ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"}`}
          >
            {isDemo
              ? "Mode Démonstration"
              : role === "admin"
                ? "Administrateur"
                : "Enseignant certifié"}
          </Badge>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">
            Connecté :{" "}
            <strong className="text-foreground">
              {isDemo
                ? "Professeur (Démo)"
                : `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() ||
                  user?.email ||
                  "Enseignant"}
            </strong>
          </span>
          {(role === "admin" || isDemo) && (
            <Link
              to="/admin"
              search={isDemo ? { demo: "true" } : {}}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              Espace Admin
            </Link>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => selectedClassId && loadClassDetails(selectedClassId)}
            className="h-8 text-xs gap-1.5"
            disabled={loadingData}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Sélecteur de classe */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mr-2">
              <FolderOpen className="w-4 h-4 text-primary" />
              Classe active :
            </span>

            {classes.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedClassId === c.id ? "default" : "outline"}
                onClick={() => setSelectedClassId(c.id)}
                className="text-xs h-8 gap-1.5"
              >
                <span>{c.nom}</span>
                <span className="opacity-70 text-[10px]">({c.members_count} élèves)</span>
              </Button>
            ))}

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCreatingClass(true)}
              className="text-xs h-8 gap-1 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle classe
            </Button>
          </div>
        </div>

        {/* Modal / Formulaire de création de classe */}
        {isCreatingClass && (
          <form
            onSubmit={handleCreateClass}
            className="p-4 border rounded-xl bg-card space-y-3 max-w-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">Ajouter une classe</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setIsCreatingClass(false)}
              >
                Annuler
              </Button>
            </div>

            {newClassError && <p className="text-xs text-destructive">{newClassError}</p>}

            <div>
              <Input
                placeholder="Nom de la classe (ex: Terminale STI2D-A)"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="text-xs"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" className="text-xs">
                Créer la classe
              </Button>
            </div>
          </form>
        )}

        {/* Vue détaillée de la classe active */}
        {activeClass ? (
          <div className="space-y-6">
            {/* Cartes métriques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Élèves inscrits</p>
                    <h3 className="text-2xl font-bold mt-1">{totalEleves}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Moyenne formative</p>
                    <h3 className="text-2xl font-bold mt-1">{moyenneClasse}%</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Copies rendues</p>
                    <h3 className="text-2xl font-bold mt-1">
                      {copiesRendues} / {totalEleves}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">
                      Alertes / Difficultés
                    </p>
                    <h3 className="text-2xl font-bold mt-1 text-amber-500">{elevesEnDifficulte}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Onglets : Suivi en direct & Gestion des invitations */}
            <Tabs defaultValue="progression" className="space-y-4">
              <TabsList className="bg-muted/40 p-1">
                <TabsTrigger value="progression" className="text-xs">
                  Suivi de progression en temps réel
                </TabsTrigger>
                <TabsTrigger value="invitations" className="text-xs">
                  Codes d'invitation ({invitations.length})
                </TabsTrigger>
                <TabsTrigger value="contestations" className="text-xs">
                  Contestations d'élèves (F-44)
                </TabsTrigger>
                <TabsTrigger value="studio" className="text-xs">
                  Studio de Sujets & Immuabilité
                </TabsTrigger>
              </TabsList>

              <TabsContent value="progression">
                <StudentProgressTable
                  students={students}
                  loading={loadingData}
                  onInspectCopy={handleInspectCopy}
                  onExportCsv={handleExportCsv}
                />
              </TabsContent>

              <TabsContent value="invitations">
                <InvitationsManager
                  classId={activeClass.id}
                  className={activeClass.nom}
                  invitations={invitations}
                  onRefresh={() => loadClassDetails(activeClass.id)}
                />
              </TabsContent>

              <TabsContent value="contestations">
                <ContestationsManager classId={activeClass.id} className={activeClass.nom} />
              </TabsContent>

              <TabsContent value="studio">
                <SubjectStudioTab />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-16 border rounded-xl bg-card space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <h3 className="text-sm font-semibold">Aucune classe pour l'instant</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Créez votre première classe pour générer des codes d'accès et suivre le travail de vos
              élèves en direct.
            </p>
            <Button size="sm" onClick={() => setIsCreatingClass(true)} className="gap-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Créer ma première classe
            </Button>
          </div>
        )}
      </main>

      {/* Modal d'inspection de copie en lecture seule (Monaco Editor) */}
      <StudentCopyModal
        isOpen={inspectingStudent !== null}
        onClose={() => setInspectingStudent(null)}
        eleve={inspectingStudent}
        files={inspectingFiles}
        loading={loadingCopy}
      />
    </div>
  );
}
