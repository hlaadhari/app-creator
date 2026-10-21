import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SubjectStatement } from "@/components/workspace/SubjectStatement";
import { initialExercises } from "@/lib/exercises";
import { contentSubjects } from "@/lib/content/all-subjects";

/** Ne garde que les lettres et chiffres : compare le texte sans tenir compte de la mise en forme. */
const normaliser = (texte: string) => texte.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * Lignes du source qui portent du texte lisible (hors séparateurs de tableau et clôtures de code).
 * Les marqueurs de liste (« 1. », « - ») et les clôtures de code (```sql) sont retirés : la mise
 * en forme les affiche sans les mettre dans le texte.
 */
function lignesDuSource(markdown: string): string[] {
  return markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !l.startsWith("```"))
    .map((l) => l.replace(/^(\d+\.|[-*+])\s+/, ""))
    .filter((l) => normaliser(l).length > 0);
}

describe("Énoncé complet du sujet (issue #80)", () => {
  const sujets = [...initialExercises, ...contentSubjects];
  const avecEnonce = sujets.filter((s) => (s.enonceMarkdown ?? "").trim().length > 0);

  it("les sujets du dossier content/ ont tous un énoncé complet", () => {
    expect(contentSubjects.length).toBeGreaterThanOrEqual(10);
    for (const s of contentSubjects) {
      expect(s.enonceMarkdown?.trim().length ?? 0, s.id).toBeGreaterThan(500);
    }
  });

  describe.each(avecEnonce.map((s) => [s.id, s] as const))("sujet %s", (_id, sujet) => {
    it("affiche l'énoncé en entier, ligne par ligne et dans l'ordre", () => {
      const { container } = render(
        <SubjectStatement
          title={sujet.title}
          statement={sujet.statement}
          enonceMarkdown={sujet.enonceMarkdown}
        />,
      );

      const rendu = normaliser(container.textContent ?? "");
      let position = 0;
      for (const ligne of lignesDuSource(sujet.enonceMarkdown ?? "")) {
        const cherche = normaliser(ligne);
        const index = rendu.indexOf(cherche, position);
        expect(
          index,
          `ligne absente ou hors ordre : « ${ligne.slice(0, 80)} »`,
        ).toBeGreaterThanOrEqual(0);
        position = index + cherche.length;
      }
    });

    it("rend autant de tableaux et de titres que le source", () => {
      const source = sujet.enonceMarkdown ?? "";
      const horsCode = source.replace(/```[\s\S]*?```/g, "");
      const titres = (horsCode.match(/^#{1,4} /gm) ?? []).length;
      const tableaux = (horsCode.match(/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm) ?? [])
        .length;

      const { container } = render(
        <SubjectStatement
          title={sujet.title}
          statement={sujet.statement}
          enonceMarkdown={sujet.enonceMarkdown}
        />,
      );

      expect(container.querySelectorAll("h3, h4, h5").length).toBeGreaterThanOrEqual(titres);
      expect(container.querySelectorAll("table").length).toBe(tableaux);
    });
  });

  it("affiche les consignes courtes quand le sujet n'a pas d'énoncé complet", () => {
    render(<SubjectStatement title="Sujet" statement={["Faire A", "Faire B"]} />);

    expect(screen.getByText("Instructions")).toBeTruthy();
    expect(screen.getByText("Faire A")).toBeTruthy();
    expect(screen.getByText("Faire B")).toBeTruthy();
    expect(screen.queryByTestId("enonce-complet")).toBeNull();
  });

  it("remplace les consignes courtes par l'énoncé complet quand il existe", () => {
    render(
      <SubjectStatement
        title="Sujet"
        statement={["Consigne courte"]}
        enonceMarkdown={"# Titre\n\nTexte complet de l'énoncé."}
      />,
    );

    expect(screen.getByText("Énoncé complet")).toBeTruthy();
    expect(screen.getByText("Texte complet de l'énoncé.")).toBeTruthy();
    expect(screen.queryByText("Consigne courte")).toBeNull();
  });

  it("ouvre une vue agrandie avec le même énoncé", () => {
    render(
      <SubjectStatement
        title="Épreuve pratique"
        statement={[]}
        enonceMarkdown={"## Partie 1\n\nTexte long de la partie 1."}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Agrandir/ }));

    const dialogue = screen.getByRole("dialog");
    expect(within(dialogue).getByText("Épreuve pratique")).toBeTruthy();
    expect(within(dialogue).getByText("Texte long de la partie 1.")).toBeTruthy();
  });

  describe("rendu sûr du contenu", () => {
    const hostile = [
      "Avant",
      "",
      "<script>window.__pwn = 1</script>",
      "",
      '<img src="x" onerror="window.__pwn = 2">',
      "",
      "[lien piégé](javascript:window.__pwn=3)",
      "",
      "![pixel espion](https://exemple.invalid/pixel.png)",
      "",
      "[lien sûr](https://exemple.fr/doc)",
      "",
      "Après",
    ].join("\n");

    it("n'interprète ni scripts, ni HTML brut, ni liens javascript:, et ne charge aucune image", () => {
      const { container } = render(
        <SubjectStatement title="Piège" statement={[]} enonceMarkdown={hostile} />,
      );

      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      expect(container.querySelector("[onerror]")).toBeNull();
      expect(container.querySelector('a[href^="javascript:" i]')).toBeNull();
      expect((window as unknown as { __pwn?: number }).__pwn).toBeUndefined();

      // Le texte reste lisible, le lien http(s) est conservé avec rel sécurisé.
      expect(container.textContent).toContain("lien piégé");
      const lien = container.querySelector('a[href="https://exemple.fr/doc"]');
      expect(lien?.getAttribute("rel")).toContain("noopener");
      expect(lien?.getAttribute("target")).toBe("_blank");
      expect(container.textContent).toContain("Avant");
      expect(container.textContent).toContain("Après");
    });
  });
});
