import React, { useRef, useState } from "react";
import {
  FileCode,
  FileText,
  FileImage,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type { WorkspaceFile } from "./types";

interface WorkspaceFileTreeProps {
  folderName: string;
  files: Record<string, WorkspaceFile>;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onAddFile: (file: WorkspaceFile) => void;
  onDeleteFile: (fileName: string) => void;
}

export function WorkspaceFileTree({
  folderName,
  files,
  activeFile,
  onSelectFile,
  onAddFile,
  onDeleteFile,
}: WorkspaceFileTreeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: WorkspaceFile) => {
    if (file.type === "asset") {
      return <FileImage className="h-4 w-4 text-purple-400 shrink-0" />;
    }
    if (file.name.endsWith(".html")) {
      return <span className="font-mono text-xs font-bold text-orange-500 shrink-0">&lt;&gt;</span>;
    }
    if (file.name.endsWith(".css")) {
      return <span className="font-mono text-xs font-bold text-sky-400 shrink-0">#</span>;
    }
    if (file.name.endsWith(".js")) {
      return <span className="font-mono text-xs font-bold text-amber-400 shrink-0">&#123;&#125;</span>;
    }
    return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      if (file) {
        processFile(file);
      }
    }
    e.target.value = "";
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    const isImage = file.type.startsWith("image/");

    if (isImage) {
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        onAddFile({
          name: file.name,
          type: "asset",
          content: base64,
          mimeType: file.type,
          size: file.size,
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        let lang: "html" | "css" | "javascript" | undefined;
        if (file.name.endsWith(".html")) lang = "html";
        else if (file.name.endsWith(".css")) lang = "css";
        else if (file.name.endsWith(".js")) lang = "javascript";

        onAddFile({
          name: file.name,
          type: "text",
          content: text,
          language: lang,
          size: file.size,
        });
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file) {
          processFile(file);
        }
      }
    }
  };

  const protectedFiles = ["index.html", "style.css", "script.js"];

  return (
    <div
      className={`flex flex-col h-full bg-panel text-xs select-none border-r ${
        isDragOver ? "bg-accent/40 ring-1 ring-primary" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between border-b px-3 py-2 text-muted-foreground font-mono uppercase tracking-wider text-[11px]">
        <span>Explorateur</span>
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Importer une image ou ressource locale"
          className="hover:text-foreground p-0.5 rounded transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.html,.css,.js,.svg,.woff2"
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex-1 overflow-auto p-2">
        {/* Dossier normalisé Travail_Eleve/SW_xxxxx */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer hover:bg-accent/50 text-foreground font-medium"
        >
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <span className="truncate font-mono">{folderName}</span>
        </div>

        {isOpen && (
          <div className="pl-4 mt-0.5 space-y-0.5 border-l border-border/40 ml-3">
            {Object.values(files).map((f) => {
              const isActive = activeFile === f.name;
              const isDeletable = !protectedFiles.includes(f.name);

              return (
                <div
                  key={f.name}
                  onClick={() => onSelectFile(f.name)}
                  className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                    isActive
                      ? "bg-editor text-foreground font-medium border-l-2 border-primary"
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {getFileIcon(f)}
                    <span className="truncate font-mono">{f.name}</span>
                  </div>

                  {isDeletable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer le fichier ${f.name} ?`)) {
                          onDeleteFile(f.name);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 transition-opacity"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Guide glisser-déposer */}
      <div className="p-2 border-t text-[10px] text-muted-foreground/80 font-mono text-center">
        <span>Glissez des images ou fichiers ici</span>
      </div>
    </div>
  );
}
