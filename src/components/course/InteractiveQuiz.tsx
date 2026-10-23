import React, { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Terminal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModuleQuiz } from "./ModuleQuiz";
import type { NotebookCategoryId } from "@/content/notebook-sti";

interface SyntaxExercise {
  moduleId: NotebookCategoryId;
  prompt: string;
  placeholder: string;
  expectedRegex: RegExp;
  canonicalAnswer: string;
  hint: string;
}

const SYNTAX_EXERCISES: Record<NotebookCategoryId, SyntaxExercise> = {
  html5: {
    moduleId: "html5",
    prompt:
      "Écrivez l'attribut d'événement HTML de la balise <form> qui appelle verif() et bloque l'envoi si elle retourne false :",
    placeholder: 'onsubmit="return verif();"',
    expectedRegex: /onsubmit\s*=\s*["']\s*return\s+verif\s*\(\s*\)\s*;?\s*["']/i,
    canonicalAnswer: 'onsubmit="return verif();"',
    hint: "N'oubliez pas le mot-clé return devant l'appel à verif().",
  },
  css3: {
    moduleId: "css3",
    prompt:
      "Écrivez la déclaration CSS3 qui transforme une balise <label> en bloc en ligne acceptant une largeur fixe (width) :",
    placeholder: "display: inline-block;",
    expectedRegex: /display\s*:\s*inline-block\s*;?/i,
    canonicalAnswer: "display: inline-block;",
    hint: "Utilisez la propriété display avec la valeur combinant inline et block.",
  },
  js: {
    moduleId: "js",
    prompt:
      "Écrivez l'instruction JavaScript qui interrompt la fonction verif() et annule l'envoi du formulaire après un alert() :",
    placeholder: "return false;",
    expectedRegex: /return\s+false\s*;?/i,
    canonicalAnswer: "return false;",
    hint: "Renvoyez le booléen false.",
  },
  php: {
    moduleId: "php",
    prompt:
      "Écrivez l'appel procédural MySQLi permettant d'exécuter la requête $req sur la connexion $cnx :",
    placeholder: "mysqli_query($cnx, $req);",
    expectedRegex: /mysqli_query\s*\(\s*\$cnx\s*,\s*\$[a-zA-Z0-9_]+\s*\)/i,
    canonicalAnswer: "mysqli_query($cnx, $req);",
    hint: "En MySQLi procédural, le 1er argument est toujours la connexion $cnx et le 2nd est la chaîne SQL.",
  },
  sql: {
    moduleId: "sql",
    prompt:
      "Écrivez la contrainte de table SQL définissant une clé primaire composée sur (dateloc, numloc) :",
    placeholder: "PRIMARY KEY (dateloc, numloc)",
    expectedRegex: /PRIMARY\s+KEY\s*\(\s*dateloc\s*,\s*numloc\s*\)/i,
    canonicalAnswer: "PRIMARY KEY (dateloc, numloc)",
    hint: "Utilisez la clause PRIMARY KEY suivie des deux colonnes entre parenthèses.",
  },
  annales: {
    moduleId: "annales",
    prompt:
      "Écrivez l'expression PHP permettant de compter le nombre de lignes retournées par un résultat SELECT $res :",
    placeholder: "mysqli_num_rows($res)",
    expectedRegex: /mysqli_num_rows\s*\(\s*\$res[a-zA-Z0-9_]*\s*\)/i,
    canonicalAnswer: "mysqli_num_rows($res)",
    hint: "Utilisez la fonction procédurale mysqli_num_rows(...) sur la ressource de résultat.",
  },
};

interface InteractiveQuizProps {
  moduleId: NotebookCategoryId;
}

export function InteractiveQuiz({ moduleId }: InteractiveQuizProps) {
  const syntaxEx = SYNTAX_EXERCISES[moduleId];
  const [userCode, setUserCode] = useState("");
  const [status, setStatus] = useState<"idle" | "valid" | "invalid">("idle");

  useEffect(() => {
    setUserCode("");
    setStatus("idle");
  }, [moduleId]);

  const handleCheckSyntax = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userCode.trim()) return;
    if (syntaxEx.expectedRegex.test(userCode.trim())) {
      setStatus("valid");
    } else {
      setStatus("invalid");
    }
  };

  return (
    <div className="space-y-5" data-testid="interactive-quiz-container">
      {/* QCM de validation du chapitre */}
      <ModuleQuiz moduleId={moduleId} />

      {/* Défi rapide d'écriture de syntaxe officielle Bac STI */}
      <div className="rounded-xl border border-primary/30 bg-panel/80 p-4 sm:p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/15 text-primary">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <span>Test Express de Syntaxe Officielle Bac STI</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Vérifiez votre maîtrise de la syntaxe exacte attendue sur la feuille d'examen
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs sm:text-sm font-medium text-foreground">{syntaxEx.prompt}</p>

        <form onSubmit={handleCheckSyntax} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={userCode}
            onChange={(e) => {
              setUserCode(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder={syntaxEx.placeholder}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-950 text-emerald-300 border border-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" size="sm" className="h-9 px-4 text-xs cursor-pointer shrink-0">
            Vérifier la syntaxe
          </Button>
        </form>

        {status === "valid" && (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Syntaxe 100 % conforme au programme Bac STI !</strong> (
              <code className="font-mono">{syntaxEx.canonicalAnswer}</code>)
            </span>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-1 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
            <div className="flex items-center gap-2 font-semibold text-amber-300">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Indice : {syntaxEx.hint}</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground">
              Syntaxe officielle attendue :{" "}
              <code className="text-emerald-300">{syntaxEx.canonicalAnswer}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
