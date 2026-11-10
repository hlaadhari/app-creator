import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, GitCommit, Scale, Users } from "lucide-react";
import { AppFooter, AppIdentity } from "@/components/AppIdentity";
import { APP_INFO, formatBuildDate } from "@/lib/app-info";

export const Route = createFileRoute("/a-propos")({
  head: () => ({
    meta: [
      { title: "À propos — Labo STI" },
      {
        name: "description",
        content: "Droits, version et auteurs de Labo STI, atelier d'entraînement au Bac STI.",
      },
    ],
  }),
  component: AProposPage,
});

function Section({
  icon,
  titre,
  children,
}: {
  icon: ReactNode;
  titre: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {icon}
        {titre}
      </h2>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  );
}

function AProposPage() {
  const dateBuild = formatBuildDate();
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au catalogue
        </Link>
        <h1 className="sr-only">À propos de {APP_INFO.nom}</h1>
        <AppIdentity />

        <div className="mt-8 grid gap-4">
          <Section icon={<Scale className="h-3.5 w-3.5" />} titre="Droits">
            <p>{APP_INFO.copyright}</p>
            <p>
              Code source publié sous{" "}
              <a
                href={APP_INFO.licence.url}
                className="text-primary underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                {APP_INFO.licence.nom}
              </a>
              .
            </p>
            <p className="text-muted-foreground">{APP_INFO.mentionContenus}</p>
          </Section>

          <Section icon={<GitCommit className="h-3.5 w-3.5" />} titre="Révision">
            <dl className="grid grid-cols-[8rem_1fr] gap-y-1 font-mono text-xs">
              <dt className="text-muted-foreground">Version</dt>
              <dd data-testid="app-version">{APP_INFO.version}</dd>
              <dt className="text-muted-foreground">Révision git</dt>
              <dd data-testid="app-revision">{APP_INFO.revision}</dd>
              {dateBuild && (
                <>
                  <dt className="text-muted-foreground">Construit le</dt>
                  <dd>{dateBuild}</dd>
                </>
              )}
            </dl>
            <a
              href={APP_INFO.depot}
              className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Dépôt du code source <ExternalLink className="h-3 w-3" />
            </a>
          </Section>

          <Section icon={<Users className="h-3.5 w-3.5" />} titre="Auteurs">
            <ul className="space-y-1.5">
              {APP_INFO.auteurs.map((a) => (
                <li key={a.nom} className="flex flex-wrap items-baseline gap-x-2">
                  {a.href ? (
                    <a
                      href={a.href}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {a.nom}
                    </a>
                  ) : (
                    <span className="font-medium">{a.nom}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{a.role}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Développé avec l'assistance de {APP_INFO.outils.join(" et ")}.
            </p>
          </Section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
