import React, { useState, useMemo, useEffect } from "react";
import { Monitor, Smartphone, Tablet, RotateCw } from "lucide-react";
import type { WorkspaceFile, ViewportMode } from "./types";

interface PreviewSandboxProps {
  files: Record<string, WorkspaceFile>;
  className?: string;
}

export function PreviewSandbox({ files, className = "" }: PreviewSandboxProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  // Rafraîchissement à chaud avec debounce 300ms lors de la saisie
  const [debouncedFiles, setDebouncedFiles] = useState(files);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFiles(files);
    }, 300);
    return () => clearTimeout(timer);
  }, [files]);

  const previewDoc = useMemo(() => {
    const htmlKey =
      debouncedFiles["index.html"] !== undefined
        ? "index.html"
        : (Object.keys(debouncedFiles).find((k) => k.endsWith(".html")) ?? "index.html");
    let html = debouncedFiles[htmlKey]?.content ?? "<!DOCTYPE html><html><body></body></html>";

    // Collecter l'ensemble des fichiers CSS (style.css, mesStyles.css, etc.)
    const css = Object.entries(debouncedFiles)
      .filter(([k]) => k.endsWith(".css"))
      .map(([name, f]) => `/* === ${name} === */\n${f.content}`)
      .join("\n\n");

    const js = Object.entries(debouncedFiles)
      .filter(([k]) => k.endsWith(".js"))
      .map(([, f]) => f.content)
      .join("\n");

    // 1. Remplacement des images et assets locaux par leurs données Base64 / Blobs
    for (const [name, file] of Object.entries(debouncedFiles)) {
      if (file.type === "asset" && file.content) {
        // Remplacement des occurrences relatives (ex: "photo.jpg", "./photo.jpg")
        const regex = new RegExp(
          `(["'])(?:\\.\\/)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(["'])`,
          "g",
        );
        html = html.replace(regex, `$1${file.content}$2`);
      }
    }

    // Neutraliser les balises <link rel="stylesheet"> locales pour éviter les 404 dans l'iframe
    html = html.replace(
      /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["'](?:\.\/)?[^"']+\.css["'][^>]*\/?>/gi,
      "<!-- Feuille de style injectée dynamiquement par le bac à sable STI -->",
    );

    // 2. Injection dynamique du style CSS3 (dans la balise <head> ou au début)
    const styleTag = `<style id="labo-sti-styles">\n${css}\n</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${styleTag}\n</head>`);
    } else {
      html = `${styleTag}\n${html}`;
    }

    // 3. Script d'isolation de sécurité T-11 et blocage de stockage parent (PRD F-24, T-11)
    const securityScript = `
<script id="labo-sti-security">
  (function() {
    // Isolation du stockage et cookies de l'application hôte
    try {
      Object.defineProperty(window, 'localStorage', {
        get: function() { throw new Error("Accès à localStorage interdit dans le bac à sable."); },
        configurable: false
      });
    } catch(e) {}
    try {
      Object.defineProperty(window, 'sessionStorage', {
        get: function() { throw new Error("Accès à sessionStorage interdit dans le bac à sable."); },
        configurable: false
      });
    } catch(e) {}
    try {
      Object.defineProperty(document, 'cookie', {
        get: function() { return ""; },
        set: function() { throw new Error("Accès aux cookies interdit dans le bac à sable."); },
        configurable: false
      });
    } catch(e) {}

    // Blocage absolu des requêtes réseau sortantes (T-11)
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
  }, [debouncedFiles]);

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
          <span className="text-[10px] text-muted-foreground/80 hidden sm:inline">
            (Isolation sandbox étanche)
          </span>
        </div>

        <div className="flex items-center gap-1 bg-background/60 p-0.5 rounded border">
          <button
            onClick={() => setViewport("desktop")}
            className={`p-1 rounded transition-colors ${
              viewport === "desktop"
                ? "bg-accent text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vue Bureau (100%)"
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            className={`p-1 rounded transition-colors ${
              viewport === "tablet"
                ? "bg-accent text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vue Tablette (768px)"
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`p-1 rounded transition-colors ${
              viewport === "mobile"
                ? "bg-accent text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
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
            sandbox="allow-scripts allow-forms"
            srcDoc={previewDoc}
            className="flex-1 w-full h-full border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
}
