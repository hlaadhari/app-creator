import React, { useEffect, useState, useCallback } from "react";
import {
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw,
  Save,
  AlertCircle,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  listerCopiesExamenEcritEnseignant,
  noterCopieExamenEcrit,
  type TeacherWrittenExamCopyRecord,
} from "@/lib/exam/written-exam-service";
import { getWrittenExamPublic, sampleWrittenExam } from "@/lib/content/written-subjects";

export interface WrittenExamCopiesTabProps {
  classId: string;
  className: string;
}

export const WrittenExamCopiesTab: React.FC<WrittenExamCopiesTabProps> = ({
  classId,
  className,
}) => {
  const [copies, setCopies] = useState<TeacherWrittenExamCopyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCopy, setSelectedCopy] = useState<TeacherWrittenExamCopyRecord | null>(null);
  const [openScores, setOpenScores] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadCopies = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listerCopiesExamenEcritEnseignant(classId);
      setCopies(list);
      if (selectedCopy) {
        const updated = list.find((c) => c.copieId === selectedCopy.copieId) ?? null;
        setSelectedCopy(updated);
      }
    } finally {
      setLoading(false);
    }
  }, [classId, selectedCopy]);

  useEffect(() => {
    void loadCopies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleSelectCopy = (copy: TeacherWrittenExamCopyRecord) => {
    setSelectedCopy(copy);
    setOpenScores(copy.notesEnseignant || {});
    setCommentaire(copy.commentaireEnseignant || "");
    setFeedbackMsg(null);
  };

  const handleScoreChange = (questionId: string, maxPoints: number, rawVal: string) => {
    const parsed = Number.parseFloat(rawVal);
    const clamped = Number.isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), maxPoints);
    setOpenScores((prev) => ({
      ...prev,
      [questionId]: clamped,
    }));
  };

  const handleSaveGrading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCopy) return;
    setSaving(true);
    setFeedbackMsg(null);

    const res = await noterCopieExamenEcrit(selectedCopy.copieId, openScores, commentaire);
    setSaving(false);

    if (res.success) {
      setFeedbackMsg({
        type: "ok",
        text: `Correction enregistrée : note finale officielle scellée à ${res.noteFinale ?? 0} / ${res.baremeTotal ?? 20}.`,
      });
      await loadCopies();
    } else {
      setFeedbackMsg({
        type: "err",
        text: res.error ?? "Impossible d'enregistrer la correction.",
      });
    }
  };

  const selectedManifest = selectedCopy
    ? (getWrittenExamPublic(selectedCopy.examId) ?? sampleWrittenExam)
    : null;

  const openQuestions = selectedManifest
    ? selectedManifest.sections
        .filter((s) => s.type !== "qcm")
        .flatMap((s) =>
          s.questions.map((q) => ({
            sectionTitle: s.title,
            id: q.id,
            prompt: "prompt" in q ? q.prompt : q.question,
            points: q.points,
          })),
        )
    : [];

  return (
    <div className="space-y-4" data-testid="written-exam-copies-tab">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Copies d'Épreuves Écrites — {className}
          </h2>
          <p className="text-xs text-muted-foreground">
            Les QCM sont corrigés automatiquement par le serveur. Attribuez ici les points des
            questions ouvertes (Modélisation, SQL, Analyse de code) pour sceller la note finale.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void loadCopies()}
          disabled={loading}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser les copies
        </Button>
      </div>

      {copies.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="p-8 text-center space-y-2">
            <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-medium text-foreground">
              Aucune copie d'épreuve écrite enregistrée pour cette classe
            </p>
            <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
              Dès qu'un élève démarre ou remet une épreuve écrite, sa copie et son empreinte SHA-256
              apparaissent ici pour correction.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Liste des copies */}
          <div className="lg:col-span-5 space-y-2">
            {copies.map((copy) => {
              const isSelected = selectedCopy?.copieId === copy.copieId;
              return (
                <div
                  key={copy.copieId}
                  onClick={() => handleSelectCopy(copy)}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">
                      {copy.elevePrenom} {copy.eleveNom}
                    </span>
                    {copy.statut === "corrigee" ? (
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Corrigée ({copy.noteFinale}/{copy.baremeTotal})
                      </Badge>
                    ) : copy.statut === "remise" ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-amber-500/40 text-amber-600"
                      >
                        <Clock className="w-3 h-3" />À corriger (QCM : {copy.scoreQcm ?? 0}/
                        {copy.maxQcm})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        En cours de composition
                      </Badge>
                    )}
                  </div>

                  <div className="mt-1 text-[11px] text-muted-foreground truncate">
                    {copy.examTitle}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>
                      {copy.motifCloture === "remise_volontaire"
                        ? "Remise volontaire"
                        : copy.motifCloture === "temps_ecoule"
                          ? "Temps écoulé (T-06)"
                          : "En cours"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-primary font-medium">
                      <Eye className="w-3 h-3" /> Inspecter & noter
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panneau d'inspection et de notation des questions ouvertes */}
          <div className="lg:col-span-7">
            {selectedCopy ? (
              <form
                onSubmit={handleSaveGrading}
                className="rounded-lg border bg-card p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Copie de {selectedCopy.elevePrenom} {selectedCopy.eleveNom}
                    </h3>
                    <p className="text-xs text-muted-foreground">{selectedCopy.examTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCopy.hashSha256 && (
                      <Badge variant="outline" className="text-[10px] font-mono gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {selectedCopy.hashSha256.slice(0, 10)}…
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      QCM serveur : {selectedCopy.scoreQcm ?? 0} / {selectedCopy.maxQcm} pts
                    </Badge>
                  </div>
                </div>

                {feedbackMsg && (
                  <div
                    role="alert"
                    className={`rounded-md border px-3 py-2 text-xs flex items-center gap-2 ${
                      feedbackMsg.type === "ok"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-destructive/40 bg-destructive/10 text-destructive"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {openQuestions.map((q) => {
                    const rawAns = selectedCopy.reponses[q.id];
                    const formattedAns =
                      rawAns === undefined || rawAns === null || rawAns === ""
                        ? "(Aucune réponse fournie par l'élève)"
                        : typeof rawAns === "string"
                          ? rawAns
                          : JSON.stringify(rawAns, null, 2);

                    return (
                      <div key={q.id} className="rounded-md border p-3 bg-muted/20 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                              {q.sectionTitle} — {q.id}
                            </span>
                            <p className="text-xs font-medium text-foreground mt-0.5">{q.prompt}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Input
                              type="number"
                              step="0.25"
                              min={0}
                              max={q.points}
                              value={openScores[q.id] ?? 0}
                              onChange={(e) => handleScoreChange(q.id, q.points, e.target.value)}
                              className="w-20 h-7 text-xs font-mono text-right"
                              aria-label={`Note pour ${q.id}`}
                            />
                            <span className="text-xs text-muted-foreground font-mono">
                              / {q.points} pts
                            </span>
                          </div>
                        </div>

                        <pre className="rounded bg-background p-2.5 text-xs font-mono whitespace-pre-wrap border overflow-x-auto">
                          {formattedAns}
                        </pre>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-2 border-t">
                  <label className="text-xs font-medium text-foreground">
                    Appréciation globale de l'enseignant
                  </label>
                  <Input
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Commentaire pédagogique sur la copie écrite..."
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button type="submit" size="sm" disabled={saving} className="text-xs gap-1.5">
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Enregistrement..." : "Valider et sceller la note finale"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="rounded-lg border bg-card p-8 text-center text-xs text-muted-foreground">
                Sélectionnez une copie à gauche pour inspecter les réponses de l'élève et attribuer
                les points des questions ouvertes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
