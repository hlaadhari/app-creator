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
}: MonacoEditorPaneProps) {
  const [isMounted, setIsMounted] = useState(false);
  const editorRef = useRef<unknown>(null);

  useEffect(() => {
    let active = true;
    void ensureMonacoConfigured().finally(() => {
      if (active) setIsMounted(true);
    });
    return () => {
      active = false;
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
    if (language === "html") {
      monaco.languages.html.htmlDefaults.setOptions({
        format: {
          indentInnerHtml: true,
          wrapLineLength: 120,
          unformatted: "",
        },
        suggest: { html5: true },
      });
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-editor p-8 text-muted-foreground font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>Chargement de l'éditeur Monaco...</span>
        </div>
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
          fontSize: 13.5,
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
