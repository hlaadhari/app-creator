import { describe, expect, it } from "vitest";
import {
  CONSIGNE_TUTEUR_NOTEBOOK,
  MAX_NOTEBOOK_PROMPT_LENGTH,
  construireQuestionNotebook,
  nettoyerDonneesPersonnelles,
} from "@/lib/tutor/notebook-prompt";
import { validerUrlNotebook } from "@/lib/supabase/app-settings";

describe("construireQuestionNotebook (Issue #294)", () => {
  it("construit le contexte /cours avec la consigne tuteur et le module actif", () => {
    const prompt = construireQuestionNotebook({
      source: "cours",
      moduleActif: "php",
      question: "Quelle est la différence entre mysqli_num_rows et mysqli_affected_rows ?",
    });

    expect(prompt).toContain(CONSIGNE_TUTEUR_NOTEBOOK);
    expect(prompt).toContain("Module actif : php");
    expect(prompt).toContain("mysqli_num_rows");
    expect(prompt.length).toBeLessThanOrEqual(MAX_NOTEBOOK_PROMPT_LENGTH);
  });

  it("construit le contexte atelier avec le sujet, le critère échoué et l'extrait du fichier", () => {
    const prompt = construireQuestionNotebook({
      source: "atelier",
      titreSujet: "TP Gestion Dons",
      critereEchoue: {
        code: "JS-02",
        titre: "Validation du champ CIN",
        message: "Le champ CIN doit contenir exactement 8 chiffres.",
      },
      fichierActif: "controles.js",
      contenuFichier:
        "function verif() {\n  const cin = document.getElementById('cin').value;\n  return true;\n}",
      question: "Pourquoi mon test CIN échoue ?",
    });

    expect(prompt).toContain(CONSIGNE_TUTEUR_NOTEBOOK);
    expect(prompt).toContain("Sujet : TP Gestion Dons");
    expect(prompt).toContain("[JS-02] Validation du champ CIN");
    expect(prompt).toContain("Extrait du fichier actif (controles.js)");
    expect(prompt).toContain("```javascript");
    expect(prompt).toContain("Pourquoi mon test CIN échoue ?");
  });

  it("supprime toute donnée personnelle (email, CIN, nom, UUID)", () => {
    const brut =
      "Nom : Amine Ben Salah, email amine.bs@lycee.tn, CIN : 12345678, id 550e8400-e29b-41d4-a716-446655440000";
    const nettoye = nettoyerDonneesPersonnelles(brut);

    expect(nettoye).not.toContain("amine.bs@lycee.tn");
    expect(nettoye).not.toContain("12345678");
    expect(nettoye).not.toContain("Amine Ben Salah");
    expect(nettoye).not.toContain("550e8400-e29b-41d4-a716-446655440000");

    const prompt = construireQuestionNotebook({
      source: "cours",
      moduleActif: "sql",
      question: "Je suis eleve@ecole.tn (CIN 09876543), aide-moi sur GROUP BY",
    });
    expect(prompt).not.toContain("eleve@ecole.tn");
    expect(prompt).not.toContain("09876543");
  });

  it("tronque proprement les fichiers longs à 60 lignes et la question totale à <= 4000 caractères", () => {
    const longCode = Array.from(
      { length: 120 },
      (_, i) => `const ligne_${i + 1} = "${"x".repeat(60)}";`,
    ).join("\n");

    const prompt = construireQuestionNotebook({
      source: "atelier",
      titreSujet: "Examen Bac 2026",
      fichierActif: "script.js",
      contenuFichier: longCode,
      ligneCible: 50,
      question: "Comment corriger la boucle ?",
    });

    expect(prompt.length).toBeLessThanOrEqual(MAX_NOTEBOOK_PROMPT_LENGTH);
    expect(prompt).toContain("lignes précédentes omises");
    expect(prompt).toContain("Comment corriger la boucle ?");
  });
});

describe("validerUrlNotebook (Issue #294)", () => {
  it("accepte uniquement https://notebook.google.com et https://notebooklm.google.com", () => {
    expect(
      validerUrlNotebook(
        "https://notebook.google.com/notebook/a42c871a-969a-42a2-8bb3-af3be46fcd65",
      ).valide,
    ).toBe(true);
    expect(validerUrlNotebook("https://notebooklm.google.com/notebook/abc").valide).toBe(true);

    expect(validerUrlNotebook("http://notebook.google.com/notebook/abc").valide).toBe(false);
    expect(validerUrlNotebook("https://evil.example.com/notebook/abc").valide).toBe(false);
    expect(validerUrlNotebook("").valide).toBe(false);
  });
});
