import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Sparkles,
  Lock,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import type { TutorMessage, TutorContext } from "@/lib/tutor/types";
import { interagirAvecTuteur } from "@/lib/tutor/engine";

interface PedagogicalTutorPaneProps {
  context: TutorContext;
  onSelectCriterion?: ((code: string) => void) | undefined;
}

export function PedagogicalTutorPane({ context, onSelectCriterion }: PedagogicalTutorPaneProps) {
  const [messages, setMessages] = useState<TutorMessage[]>(() => [
    {
      id: "initial-welcome",
      role: "assistant",
      content:
        "Bonjour ! Je suis votre tuteur pédagogique Labo STI. Je suis là pour vous poser les bonnes questions et vous aider à structurer votre raisonnement sans faire le travail à votre place.\n\nSur quel aspect ou critère du sujet souhaitez-vous échanger ?",
      timestamp: new Date().toISOString(),
      suggestedFollowUps: [
        "Pourquoi mon dernier test échoue ?",
        "Comment aborder ce critère ?",
        "Rappelle-moi la démarche",
      ],
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isExam = context.isExamMode;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend ?? inputPrompt).trim();
    if (!text || loading || isExam) return;

    const userMessage: TutorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");
    setLoading(true);

    try {
      const res = await interagirAvecTuteur(text, context);
      setMessages((prev) => [...prev, res.message]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Une erreur temporaire est survenue lors du traitement de votre demande.",
          timestamp: new Date().toISOString(),
          isWarning: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content:
          "Conversation réinitialisée. Quel problème ou critère souhaitez-vous analyser ensemble ?",
        timestamp: new Date().toISOString(),
        suggestedFollowUps: ["Pourquoi mon critère échoue ?", "Conseil de méthode"],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-full bg-background border-l text-foreground">
      {/* En-tête du Tuteur */}
      <div className="p-3 border-b bg-card flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold leading-none flex items-center gap-1.5">
              <span>Tuteur Pédagogique STI</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </h3>
            <span className="text-[10px] text-muted-foreground">
              {isExam ? "Mode Examen Neutralisé" : "Accompagnement socratique guidé"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isExam ? (
            <Badge
              variant="outline"
              className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 gap-1 h-5"
            >
              <Lock className="w-2.5 h-2.5" />
              Neutralisé
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/10 text-primary border-primary/30 h-5"
            >
              Mode Guidé
            </Badge>
          )}

          {!isExam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Réinitialiser l'échange"
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Alerte Examen (PRD F-56, T-06) */}
      {isExam && (
        <div className="p-4 m-3 border rounded-lg bg-destructive/5 border-destructive/30 space-y-2 text-center">
          <div className="w-8 h-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-destructive">
            Tuteur Neutralisé en Session d'Examen
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Conformément au règlement officiel des épreuves du Bac STI2D / NSI (PRD F-56, T-06),
            l'ensemble des assistants interactifs et tuteurs IA sont strictement désactivés pendant
            les sessions d'examen blanc.
          </p>
        </div>
      )}

      {/* Fil de discussion */}
      {!isExam && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 text-xs">
          {messages.map((m) => {
            const isUser = m.role === "user";

            return (
              <div key={m.id} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[88%] rounded-lg p-2.5 space-y-1.5 leading-relaxed ${
                    isUser
                      ? "bg-primary text-primary-foreground ml-4"
                      : m.isWarning
                        ? "bg-destructive/10 border border-destructive/30 text-foreground mr-4"
                        : "bg-muted/60 border text-foreground mr-4"
                  }`}
                >
                  {!isUser && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                      {m.isWarning ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-destructive" />
                          <span className="text-destructive">Règle Pédagogique</span>
                        </>
                      ) : (
                        <>
                          <Lightbulb className="w-3 h-3 text-primary" />
                          <span>Questionnement Guidé</span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="whitespace-pre-line text-xs">{m.content}</div>
                </div>

                {/* Suggestions de rebond socratique */}
                {!isUser && m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-[95%]">
                    {m.suggestedFollowUps.map((fu, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(fu)}
                        disabled={loading}
                        className="text-[10px] border rounded-full px-2 py-0.5 bg-background hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left flex items-center gap-1"
                      >
                        <HelpCircle className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span>{fu}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground italic p-2 bg-muted/20 rounded">
              <Bot className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Le tuteur formule une question de réflexion...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Barre de saisie (Désactivée en mode examen) */}
      <div className="p-3 border-t bg-card shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder={
              isExam
                ? "Désactivé pendant l'épreuve d'examen"
                : "Posez une question ou décrivez votre démarche..."
            }
            disabled={isExam || loading}
            className="text-xs h-8"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isExam || loading || !inputPrompt.trim()}
            className="h-8 px-2.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Dialogue maïeutique sans révélation directe de code solution (PRD §15).
        </p>
      </div>
    </div>
  );
}
