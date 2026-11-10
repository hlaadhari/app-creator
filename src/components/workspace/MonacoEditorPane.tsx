import { useEffect, useState, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { ensureMonacoConfigured } from "@/lib/editor/monaco-setup";

interface MonacoEditorPaneProps {
  value: string;
  onChange: (value: string) => void;
  language: "html" | "css" | "javascript" | "php" | "sql";
  theme?: "vs-dark" | "light";
  readOnly?: boolean;
  onSave?: () => void;
  onVerify?: () => void;
  onCursorChange?: (line: number, column: number) => void;
  /** Mise en page mobile : police 14 px. */
  mobile?: boolean;
}

export function MonacoEditorPane({
  value,
  onChange,
  language,
  theme = "vs-dark",
  readOnly = false,
  onSave,
  onVerify,
  onCursorChange,
  mobile = false,
}: MonacoEditorPaneProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    let active = true;
    void ensureMonacoConfigured().finally(() => {
      if (active) setIsMounted(true);
    });
    // Repli : si Monaco tarde trop (réseau lent), on propose un champ texte simple
    // pour ne jamais bloquer l'élève devant un écran de chargement (#191).
    const timer = setTimeout(() => {
      if (active) setLoadTimedOut(true);
    }, 8000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Raccourci de sauvegarde manuelle Ctrl+S / Cmd+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Raccourci de vérification automatique Ctrl+Entrée / Cmd+Entrée
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onVerify?.();
    });

    // Suivi de la position du curseur
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Configuration linguistique avancée
    // L'espace de noms `languages.html` n'existe plus dans les builds Monaco récents :
    // on le garde optionnel pour ne jamais faire planter le montage de l'éditeur.
    const htmlDefaults = (
      monaco.languages as unknown as {
        html?: { htmlDefaults?: { setOptions: (options: object) => void } };
      }
    ).html?.htmlDefaults;
    if (language === "html" && htmlDefaults) {
      htmlDefaults.setOptions({
        format: {
          indentInnerHtml: true,
          wrapLineLength: 120,
          unformatted: "",
        },
        suggest: { html5: true },
      });
    }
  };

  if (!isMounted && loadTimedOut) {
    return (
      <div className="flex flex-1 flex-col bg-editor min-h-0 h-full w-full">
        <p className="px-3 py-1.5 text-[11px] font-mono text-amber-500 border-b" role="status">
          L'éditeur avancé tarde à charger : saisie en mode texte simple (votre travail est
          conservé).
        </p>
        <textarea
          aria-label="Éditeur de code (mode texte simple)"
          className="flex-1 min-h-0 w-full resize-none bg-transparent p-3 font-mono text-[13px] text-foreground outline-none"
          value={value}
          readOnly={readOnly}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    );
  }

  if (!isMounted) {
    return (
      <div
        className="flex flex-1 flex-col gap-2 bg-editor p-4 text-muted-foreground font-mono text-xs"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement de l'éditeur Monaco...</span>
        </div>
        {[70, 45, 85, 30, 60].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-muted/40"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 w-full h-full relative">
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        theme={theme}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex h-full w-full items-center justify-center bg-editor text-muted-foreground font-mono text-xs">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Initialisation de l'environnement de code...</span>
            </div>
          </div>
        }
        options={{
          readOnly,
          fontSize: mobile ? 14 : 13.5,
          fontFamily: "'JetBrains Mono', 'IBM Plex Sans', Menlo, Monaco, Consolas, monospace",
          fontLigatures: true,
          lineHeight: 22,
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          lineNumbers: "on",
          renderLineHighlight: "all",
          minimap: { enabled: false },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          padding: { top: 8, bottom: 8 },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          quickSuggestions: { other: true, comments: false, strings: true },
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoClosingComments: "always",
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
