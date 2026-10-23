import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Code2,
  FolderTree,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  HardDrive,
  ShieldCheck,
} from "lucide-react";

const ONBOARDING_STORAGE_KEY = "labo_sti_onboarding_completed";

interface OnboardingGuideProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function OnboardingGuide({ forceOpen = false, onClose }: OnboardingGuideProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }

    if (typeof window !== "undefined") {
      const seen = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!seen) {
        setOpen(true);
      }
    }
  }, [forceOpen]);

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    }
    setOpen(false);
    if (onClose) onClose();
  };

  const steps = [
    {
      title: "Bienvenue sur Labo STI",
      subtitle: "Plateforme d'entraînement et d'examen pour le Baccalauréat STI2D",
      icon: <Code2 className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Labo STI met à votre disposition un environnement de développement web complet
            directement dans votre navigateur, conçu pour vous préparer aux épreuves pratiques en
            conditions réelles.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="rounded-lg border p-3 bg-muted/30">
              <span className="font-semibold text-foreground block mb-1">Entraînement libre</span>
              Parcourez le catalogue de sujets classés par compétences du programme (HTML, CSS, JS).
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <span className="font-semibold text-foreground block mb-1">Mode Classe</span>
              Rejoignez votre classe avec le code fourni par votre enseignant pour recevoir vos
              sujets assignés.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Espace de Code VS Code & Arborescence",
      subtitle: "Structure normalisée Travail_Eleve/SW_<id> conforme aux sujets officiels",
      icon: <FolderTree className="h-8 w-8 text-primary" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            Profitez de l'éditeur <strong>Monaco Editor</strong> avec coloration syntaxique,
            auto-complétion, raccourcis clavier (
            <kbd className="font-mono bg-muted px-1 rounded">Ctrl+S</kbd>) et gestion multi-onglets.
          </p>
          <ul className="space-y-2 list-disc pl-4 text-foreground/90">
            <li>
              <strong>Dossier normalisé</strong> : vos fichiers d'exercice sont organisés selon
              l'arborescence officielle.
            </li>
            <li>
              <strong>Glisser-déposer de ressources</strong> : importez directement des images (
              <code>.png</code>, <code>.jpg</code>, <code>.svg</code>) utilisables immédiatement
              dans votre code.
            </li>
            <li>
              <strong>Simulateur responsive</strong> : testez votre rendu en vue Ordinateur,
              Tablette ou Mobile.
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: "Auto-évaluation & Sauvegarde Garantie",
      subtitle: "Feedback immédiat et tampon local inviolable",
      icon: <ShieldCheck className="h-8 w-8 text-emerald-500" />,
      content: (
        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-foreground flex items-start gap-2">
            <HardDrive className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <strong>Principe n°4 : Ne jamais perdre votre travail</strong>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Chaque frappe est enregistrée instantanément dans votre navigateur (IndexedDB{" "}
                <code>labo_sti_buffer</code>) même sans connexion Internet.
              </p>
            </div>
          </div>
          <p>
            Cliquez à tout moment sur <strong>« Vérifier »</strong> pour évaluer votre page critère
            par critère et débloquer des indices progressifs si vous rencontrez une difficulté.
          </p>
        </div>
      ),
    },
  ];

  const current = steps[step] ?? steps[0]!;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
              {current.icon}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">{current.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {current.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 border-y my-2 min-h-[160px]">{current.content}</div>

        {/* Indicateurs de progression et actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => s - 1)}
                className="gap-1 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Précédent
              </Button>
            )}

            {step < steps.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="gap-1 text-xs font-medium"
              >
                Suivant
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleFinish}
                className="gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Commencer à coder
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
