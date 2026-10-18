import { useState, useMemo } from "react";
import { Monitor, Smartphone, Tablet, RotateCw } from "lucide-react";
import type { WorkspaceFile, ViewportMode } from "./types";

interface PreviewSandboxProps {
  files: Record<string, WorkspaceFile>;
  className?: string;
}

export function PreviewSandbox({ files, className = "" }: PreviewSandboxProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  const previewDoc = useMemo(() => {
    const htmlKey =
      files["index.html"] !== undefined
        ? "index.html"
        : Object.keys(files).find((k) => k.endsWith(".html")) ?? "index.html";
    let html = files[htmlKey]?.content ?? "<!DOCTYPE html><html><body></body></html>";
    const css = Object.entries(files)
      .filter(([k]) => k.endsWith(".css"))
      .map(([, f]) => f.content)
      .join("\n");
    const js = Object.entries(files)
      .filter(([k]) => k.endsWith(".js"))
      .map(([, f]) => f.content)
      .join("\n");

    // 1. Remplacement des images et assets locaux par leurs données Base64 / Blobs
    for (const [name, file] of Object.entries(files)) {
      if (file.type === "asset" && file.content) {
        // Remplacement des occurrences relatives (ex: "photo.jpg", "./photo.jpg")
        const regex = new RegExp(`(["'])(?:\\.\\/)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(["'])`, "g");
        html = html.replace(regex, `$1${file.content}$2`);
      }
    }

    // 2. Injection du style CSS (dans la balise <head> ou au début)
    const styleTag = `<style id="labo-sti-styles">\n${css}\n</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${styleTag}\n</head>`);
    } else {
      html = `${styleTag}\n${html}`;
    }

    // 3. Script d'isolation de sécurité T-11 (blocage absolu des requêtes sortantes)
    const securityScript = `
<script id="labo-sti-security">
  (function() {
    // T-11 : Blocage des appels réseau sortants
    window.fetch = function() {
      console.warn("[Sandbox Labo STI] Appel fetch bloqué par sécurité.");
      return Promise.reject(new Error("Accès réseau sortant interdit dans le bac à sable"));
    };
    window.XMLHttpRequest = function() {
      console.warn("[Sandbox Labo STI] XMLHttpRequest bloqué par sécurité.");
      throw new Error("Accès réseau sortant interdit dans le bac à sable");
    };
    if (window.WebSocket) {
      window.WebSocket = function() { throw new Error("WebSocket interdit dans le bac à sable"); };
    }
    if (window.EventSource) {
      window.EventSource = function() { throw new Error("EventSource interdit dans le bac à sable"); };
    }
    if (navigator.sendBeacon) {
      navigator.sendBeacon = function() { return false; };
    }
  })();
</script>`;

    // 4. Injection du JavaScript utilisateur
    const userScript = `<script id="labo-sti-user-script">\ntry {\n${js}\n} catch (e) { console.error("[Erreur Script]", e); }\n</script>`;

    if (html.includes("</body>")) {
      html = html.replace("</body>", `${securityScript}\n${userScript}\n</body>`);
    } else {
      html = `${html}\n${securityScript}\n${userScript}`;
    }

    return html;
  }, [files, reloadKey]);

  const viewportWidths: Record<ViewportMode, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      {/* Barre d'outils de l'aperçu */}
      <div className="flex items-center justify-between border-b bg-panel px-3 py-1.5 text-xs font-mono">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="font-semibold text-foreground">Aperçu en direct</span>
          <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">(Isolation sandbox sécurisée)</span>
        </div>

        <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded border">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1 rounded transition-colors ${
              viewport === "desktop" ? "bg-accent text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vue Bureau (100%)"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1 rounded transition-colors ${
              viewport === "tablet" ? "bg-accent text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vue Tablette (768px)"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1 rounded transition-colors ${
              viewport === "mobile" ? "bg-accent text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vue Mobile (375px)"
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Recharger l'aperçu"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Conteneur de l'iframe avec largeur adaptative */}
      <div className="flex-1 min-h-0 bg-muted/20 flex items-center justify-center p-2 overflow-auto">
        <div
          className="h-full bg-white shadow-xs rounded border transition-all duration-200 overflow-hidden flex flex-col"
          style={{ width: viewportWidths[viewport], maxWidth: "100%" }}
        >
          <iframe
            key={reloadKey}
            title="Aperçu du travail élève"
            sandbox="allow-scripts"
            srcDoc={previewDoc}
            className="flex-1 w-full h-full border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
}
