import React, { useState } from "react";
import { Copy, Check, Zap, FileCode2 } from "lucide-react";
import type { MementoSnippet } from "@/content/mementos";

interface CodeSnippetProps {
  snippet: MementoSnippet;
  onInsertCode?: ((code: string, targetFile?: string | undefined) => void) | undefined;
  className?: string | undefined;
}

export function CodeSnippet({ snippet, onInsertCode, className = "" }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);
  const [injected, setInjected] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erreur de copie dans le presse-papier :", err);
    }
  };

  const handleInject = () => {
    if (!onInsertCode) return;
    onInsertCode(snippet.code, snippet.targetFile);
    setInjected(true);
    setTimeout(() => setInjected(false), 2000);
  };

  const getLanguageTagColor = (lang: MementoSnippet["language"]) => {
    switch (lang) {
      case "html":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "css":
        return "bg-sky-500/15 text-sky-400 border-sky-500/30";
      case "javascript":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "php":
        return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
      case "sql":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      default:
        return "bg-muted text-foreground border-border";
    }
  };

  return (
    <div
      className={`rounded-lg border bg-editor overflow-hidden shadow-sm flex flex-col my-3.5 transition-all ${className}`}
    >
      {/* Barre d'en-tête du snippet */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-panel/75 border-b border-border/80 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getLanguageTagColor(
              snippet.language,
            )}`}
          >
            {snippet.language}
          </span>
          <span className="text-xs font-medium text-foreground truncate">{snippet.title}</span>
          {snippet.targetFile && (
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground/90 bg-background/50 px-1.5 py-0.5 rounded border border-border/50"
              title={`Fichier cible recommandé : ${snippet.targetFile}`}
            >
              <FileCode2 className="h-3 w-3 text-primary" />
              {snippet.targetFile}
            </span>
          )}
        </div>

        {/* Boutons d'action : Copier & Injecter */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
              copied
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : "bg-muted/60 hover:bg-muted text-foreground/85 hover:text-foreground border-border/60"
            }`}
            title="Copier le code dans le presse-papier"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copié !</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copier</span>
              </>
            )}
          </button>

          {onInsertCode && (
            <button
              type="button"
              onClick={handleInject}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                injected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/15 hover:bg-primary/25 text-primary border-primary/30"
              }`}
              title={`Injecter ce bloc dans l'éditeur (${snippet.targetFile ?? "fichier actif"})`}
            >
              {injected ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Injecté !</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Injecter</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code préformaté */}
      <pre className="p-3.5 m-0 text-xs font-mono overflow-x-auto leading-relaxed text-zinc-100 bg-[#0d1117] selection:bg-primary/30">
        <code>{snippet.code}</code>
      </pre>

      {/* Explication contextuelle optionnelle */}
      {snippet.explanation && (
        <div className="px-3.5 py-1.5 text-[11px] text-muted-foreground bg-panel/30 border-t border-border/40 italic">
          {snippet.explanation}
        </div>
      )}
    </div>
  );
}
