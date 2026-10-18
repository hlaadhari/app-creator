export type WorkspaceFileType = "text" | "asset";

export interface WorkspaceFile {
  name: string;
  type: WorkspaceFileType;
  content: string; // text content or base64 data URI for binary assets
  language?: "html" | "css" | "javascript" | "php" | "sql" | undefined;
  size?: number | undefined;
  mimeType?: string | undefined;
  readonly?: boolean | undefined;
}

export interface WorkspaceDirectory {
  folderName: string; // e.g. "Travail_Eleve/SW_01"
  files: Record<string, WorkspaceFile>;
  activeFile: string;
}

export type ViewportMode = "desktop" | "tablet" | "mobile";
