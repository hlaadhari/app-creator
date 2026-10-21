import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SubjectStatementProps {
  title: string;
  /** Consignes courtes : affichées seulement si le sujet n'a pas d'énoncé complet. */
  statement: string[];
  /** Énoncé complet en Markdown (contexte, schéma des tables, travail demandé, barème). */
  enonceMarkdown?: string | undefined;
}

// Rendu Markdown sûr : le HTML brut du contenu n'est pas interprété (react-markdown l'ignore),
// les images ne sont pas chargées (pas de requête réseau) et les liens n'acceptent que http(s).
const composants: Components = {
  h1: ({ children }) => (
    <h3 className="text-sm font-semibold mt-4 mb-2 text-foreground">{children}</h3>
  ),
  h2: ({ children }) => (
    <h4 className="text-xs font-mono uppercase tracking-wider text-primary mt-4 mb-2">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="text-xs font-semibold mt-3 mb-1.5 text-foreground">{children}</h5>
  ),
  h4: ({ children }) => (
    <h5 className="text-xs font-semibold mt-3 mb-1.5 text-foreground">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="text-xs leading-relaxed text-foreground/90 my-2">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground/90 my-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5 text-xs leading-relaxed text-foreground/90 my-2">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  hr: () => <hr className="my-3 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-xs text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} font-mono text-[11px]`}>{children}</code>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-md border bg-muted/60 p-3 text-[11px] leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-left text-[11px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b px-2 py-1.5 font-semibold align-top">{children}</th>
  ),
  td: ({ children }) => <td className="border-b px-2 py-1.5 align-top">{children}</td>,
  a: ({ href, children }) =>
    href && /^https?:\/\//i.test(href) ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2"
      >
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
  img: ({ alt }) => <span className="text-muted-foreground">{alt ? `[${alt}]` : ""}</span>,
};

function EnonceMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={composants}>
      {source}
    </ReactMarkdown>
  );
}

/**
 * Énoncé du sujet : le texte complet quand il existe (avec une vue agrandie pour les longs
 * énoncés d'épreuve), sinon la liste des consignes.
 */
export function SubjectStatement({ title, statement, enonceMarkdown }: SubjectStatementProps) {
  const [agrandi, setAgrandi] = useState(false);
  const source = enonceMarkdown?.trim();

  if (!source) {
    return (
      <div className="border-t pt-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Instructions
        </h3>
        <ol className="list-decimal space-y-2 pl-4 text-xs leading-relaxed text-foreground/90">
          {statement.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="border-t pt-3" data-testid="enonce-complet">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Énoncé complet
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-[10px]"
          onClick={() => setAgrandi(true)}
        >
          <Maximize2 className="h-3 w-3" />
          Agrandir
        </Button>
      </div>
      <div className="enonce-markdown">
        <EnonceMarkdown source={source} />
      </div>

      <Dialog open={agrandi} onOpenChange={setAgrandi}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Énoncé complet du sujet</DialogDescription>
          </DialogHeader>
          <div className="enonce-markdown">
            <EnonceMarkdown source={source} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
