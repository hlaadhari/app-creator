import React, { useEffect, useRef, useState } from "react";
import { Copy, Check, ArrowRightFromLine, Search } from "lucide-react";
import type { CourseModule } from "@/content/courses";

interface CourseViewerProps {
  module: CourseModule;
  searchQuery?: string | undefined;
  onInsertCode?: ((code: string) => void) | undefined;
  targetSectionId?: string | null | undefined;
  className?: string | undefined;
}

export function CourseViewer({
  module,
  searchQuery = "",
  onInsertCode,
  targetSectionId,
  className = "",
}: CourseViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [insertedIndex, setInsertedIndex] = useState<number | null>(null);

  // Faire défiler vers la section demandée lorsqu'elle change
  useEffect(() => {
    if (!targetSectionId || !containerRef.current) return;
    const targetEl = containerRef.current.querySelector(`#${targetSectionId}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [targetSectionId, module]);

  // Décoration interactive des blocs de code (<div class="code-card"> et <pre><code>)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Retirer les barres d'outils précédemment injectées
    container.querySelectorAll(".custom-code-toolbar").forEach((tb) => tb.remove());

    const preElements = container.querySelectorAll("pre");

    preElements.forEach((pre, index) => {
      const codeEl = pre.querySelector("code");
      const rawCode = codeEl?.textContent || pre.textContent || "";
      const langClass = Array.from(codeEl?.classList || []).find((c) => c.startsWith("language-"));
      const langName = langClass ? langClass.replace("language-", "").toUpperCase() : "CODE";

      // Création de la barre d'outils supérieure du bloc de code
      const toolbar = document.createElement("div");
      toolbar.className =
        "custom-code-toolbar flex items-center justify-between px-3 py-1.5 bg-background/80 border-b border-border/60 text-xs font-mono text-muted-foreground select-none rounded-t-lg";

      // Tag de langage
      const langSpan = document.createElement("span");
      langSpan.className =
        "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted/80 text-foreground/90 border border-border/40";
      langSpan.textContent = langName;
      toolbar.appendChild(langSpan);

      // Conteneur d'actions
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "flex items-center gap-1.5";

      // Bouton Copier
      const copyBtn = document.createElement("button");
      copyBtn.className =
        "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-sans font-medium bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground border border-border/40 transition-colors cursor-pointer";
      copyBtn.innerHTML = `<span>Copier</span>`;
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(rawCode);
          copyBtn.innerHTML = `<span class="text-emerald-400 font-bold">Copié !</span>`;
          setTimeout(() => {
            copyBtn.innerHTML = `<span>Copier</span>`;
          }, 2000);
        } catch (e) {
          console.error("Erreur de copie dans le presse-papier :", e);
        }
      };
      actionsDiv.appendChild(copyBtn);

      // Bouton Insérer dans l'éditeur (si disponible)
      if (onInsertCode) {
        const insertBtn = document.createElement("button");
        insertBtn.className =
          "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-sans font-medium bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-colors cursor-pointer";
        insertBtn.innerHTML = `<span>Insérer</span>`;
        insertBtn.title = "Insérer ce code dans le fichier actif de l'éditeur";
        insertBtn.onclick = () => {
          onInsertCode(rawCode);
          insertBtn.innerHTML = `<span class="text-primary font-bold">Inséré !</span>`;
          setTimeout(() => {
            insertBtn.innerHTML = `<span>Insérer</span>`;
          }, 2000);
        };
        actionsDiv.appendChild(insertBtn);
      }

      toolbar.appendChild(actionsDiv);

      // Insérer la barre d'outils juste au-dessus du <pre>
      const parent = pre.parentElement;
      if (parent && parent.classList.contains("code-card")) {
        // Remplacer l'éventuel header statique existant par notre toolbar interactive
        const existingHeader = parent.querySelector(".code-card-header");
        if (existingHeader) existingHeader.remove();
        parent.insertBefore(toolbar, pre);
      } else {
        pre.parentNode?.insertBefore(toolbar, pre);
      }
    });
  }, [module.rawHtml, onInsertCode]);

  return (
    <div
      ref={containerRef}
      className={`course-viewer flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8 text-foreground min-h-0 bg-background/50 ${className}`}
    >
      <div
        className="course-content max-w-4xl mx-auto space-y-8"
        dangerouslySetInnerHTML={{ __html: module.rawHtml }}
      />
    </div>
  );
}
