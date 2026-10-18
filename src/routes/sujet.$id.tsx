import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { buildDocument, getExercise, runCriteria, score, type FileName, type Files, type Result } from "@/lib/exercises";
import { clear, load, save } from "@/lib/progress";
import { SproutLogo } from "@/components/SproutLogo";
import { AuthModal } from "@/components/AuthModal";
import { enregistrerTentative } from "@/lib/supabase/projets";

export const Route = createFileRoute("/sujet/$id")({
  loader: ({ params }) => {
    const ex = getExercise(params.id);
    if (!ex) throw notFound();
    return { title: ex.title, competence: ex.competence };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      { name: "description", content: `Sujet d'entraînement : ${loaderData?.competence ?? ""}` },
      { property: "og:title", content: `${loaderData?.title ?? "Sujet"} – Labo STI` },
      { property: "og:description", content: `Sujet d'entraînement Bac STI : ${loaderData?.competence ?? ""}` },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

const FILES: FileName[] = ["index.html", "style.css", "script.js"];
const icon: Record<FileName, string> = { "index.html": "text-destructive", "style.css": "text-accent-foreground", "script.js": "text-primary" };

function Workspace() {
  const { id } = Route.useParams();
  const ex = getExercise(id)!;
  const [files, setFiles] = useState<Files>(ex.starter);
  const [active, setActive] = useState<FileName>("index.html");
  const [preview, setPreview] = useState(() => buildDocument(ex.starter));
  const [results, setResults] = useState<Result[] | null>(null);
  const [hints, setHints] = useState(0);
  const [tab, setTab] = useState<"sujet" | "resultats">("sujet");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const best = useRef<number | undefined>(undefined);
  const loaded = useRef(false);

  useEffect(() => {
    const s = load(id);
    if (s) { setFiles(s.files); setPreview(buildDocument(s.files)); best.current = s.best; setSavedAt(s.savedAt); }
    loaded.current = true;
  }, [id]);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      setPreview(buildDocument(files));
      const now = Date.now();
      save(id, { files, best: best.current, savedAt: now });
      setSavedAt(now);
    }, 500);
    return () => clearTimeout(t);
  }, [files, id]);

  const verify = () => {
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
    frame.style.cssText = "position:absolute;width:800px;height:600px;left:-9999px;";
    document.body.appendChild(frame);
    frame.onload = () => {
      const doc = frame.contentDocument!, win = frame.contentWindow!;
      const r = runCriteria(ex.criteria, doc, win);
      frame.remove();
      setResults(r);
      setTab("resultats");
      const sc = score(r);
      const n = sc.note20;
      if (best.current === undefined || n > best.current) {
        best.current = n;
        save(id, { files, best: n, savedAt: Date.now() });
      }
      enregistrerTentative({
        sujetId: id,
        pointsObtenus: sc.got,
        pointsTotal: sc.total,
        note20: sc.note20,
        details: Object.fromEntries(r.map((c) => [c.id, { ok: c.ok, label: c.label }])),
      });
    };
    frame.srcdoc = buildDocument(files);
  };

  const reset = () => {
    if (!confirm("Réinitialiser le sujet ? Votre code sera effacé.")) return;
    clear(id); best.current = undefined; setFiles(ex.starter); setResults(null); setHints(0);
  };

  const s = results ? score(results) : null;
  const lines = files[active].split("\n").length;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b bg-panel px-4 py-2 text-sm">
        <Link to="/" className="hover:opacity-85 transition-opacity flex items-center gap-2">
          <SproutLogo size="sm" showText={false} />
          <span className="font-semibold text-xs tracking-tight">Sprout Workshop</span>
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-xs font-mono">{ex.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <AuthModal />
          <button onClick={reset} className="rounded border px-3 py-1 text-muted-foreground hover:text-foreground">Réinitialiser</button>
          <button onClick={verify} className="rounded bg-primary px-4 py-1 font-medium text-primary-foreground hover:opacity-90">▶ Vérifier</button>
        </div>
      </header>

      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[300px_1fr_1fr]">
        <aside className="flex min-h-0 flex-col border-r bg-panel">
          <div className="flex border-b text-xs font-mono">
            {(["sujet", "resultats"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 uppercase tracking-wider ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
                {t === "sujet" ? "Sujet" : "Résultats"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-4 text-sm">
            {tab === "sujet" ? (
              <>
                <div className="text-xs font-mono text-primary">{ex.competence}</div>
                <ol className="mt-3 list-decimal space-y-2 pl-4">
                  {ex.statement.map((l, i) => <li key={i}>{l}</li>)}
                </ol>
                <h3 className="mt-6 text-xs font-mono uppercase tracking-wider text-muted-foreground">Indices</h3>
                <div className="mt-2 space-y-2">
                  {ex.hints.slice(0, hints).map((h, i) => (
                    <div key={i} className="rounded border-l-2 border-primary bg-muted p-2 text-xs">{h}</div>
                  ))}
                  {hints < ex.hints.length && (
                    <button onClick={() => setHints(hints + 1)} className="text-xs text-primary hover:underline">
                      Afficher l'indice {hints + 1}/{ex.hints.length}
                    </button>
                  )}
                </div>
              </>
            ) : results && s ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-semibold font-mono ${s.note20 === 20 ? "text-success" : "text-primary"}`}>{s.note20}</span>
                  <span className="text-muted-foreground">/20 · {s.got}/{s.total} pts</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {results.map((r) => (
                    <li key={r.id} className="rounded border bg-card p-2">
                      <div className="flex gap-2">
                        <span className={r.ok ? "text-success" : "text-destructive"}>{r.ok ? "✓" : "✗"}</span>
                        <span className="flex-1">{r.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{r.points} pt</span>
                      </div>
                      {!r.ok && <p className="mt-1 pl-5 text-xs text-muted-foreground">{r.message}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted-foreground">Cliquez sur « Vérifier » pour corriger votre travail.</p>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r bg-editor">
          <div className="flex border-b bg-panel text-xs font-mono">
            {FILES.map((f) => (
              <button key={f} onClick={() => setActive(f)} className={`border-r px-4 py-2 ${active === f ? "bg-editor text-foreground border-t-2 border-t-primary" : "text-muted-foreground"}`}>
                <span className={icon[f]}>●</span> {f}
              </button>
            ))}
          </div>
          <div className="flex flex-1 min-h-0 overflow-auto font-mono text-sm leading-6">
            <div className="select-none px-3 py-3 text-right text-muted-foreground/60">
              {Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              value={files[active]}
              onChange={(e) => setFiles({ ...files, [active]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const t = e.currentTarget, st = t.selectionStart, en = t.selectionEnd;
                  const v = t.value.slice(0, st) + "  " + t.value.slice(en);
                  setFiles({ ...files, [active]: v });
                  requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = st + 2; });
                }
              }}
              spellCheck={false}
              className="flex-1 resize-none whitespace-pre bg-transparent py-3 pr-4 outline-none"
              style={{ height: `${lines * 1.5 + 1.5}rem`, minHeight: "100%" }}
            />
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <div className="border-b bg-panel px-4 py-2 text-xs font-mono text-muted-foreground">Aperçu</div>
          <iframe title="Aperçu" sandbox="allow-scripts" srcDoc={preview} className="flex-1 bg-foreground" />
        </section>
      </div>

      <footer className="flex gap-4 bg-statusbar px-3 py-0.5 text-xs font-mono text-primary-foreground">
        <span>{active}</span>
        <span>{lines} lignes</span>
        <span className="ml-auto">{savedAt ? `Sauvegardé à ${new Date(savedAt).toLocaleTimeString("fr-FR")}` : "Non sauvegardé"}</span>
      </footer>
    </div>
  );
}
