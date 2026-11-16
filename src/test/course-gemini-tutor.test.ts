import { describe, expect, it, vi } from "vitest";
import {
  buildCourseGroundingContext,
  parseGeminiTutorAnswer,
  queryGeminiCourseTutor,
} from "@/lib/tutor/course-gemini";

describe("Tuteur du Cours connecté à Gemini API côté serveur", () => {
  it("bascule automatiquement sur la base locale quand GEMINI_API_KEY est absente", async () => {
    const res = await queryGeminiCourseTutor({
      query: "explique la jointure externe LEFT JOIN",
      activeCategoryId: "html5",
    });

    expect(res.mode).toBe("local");
    expect(res.source.id).toBe("kb-sql-jointures");
    expect(res.source.answer).toContain("LEFT JOIN");
  });

  it("construit un contexte de grounding pertinent à partir du référentiel STI", () => {
    const ctx = buildCourseGroundingContext(
      "c'est quoi une clé étrangère",
      "sql",
      "Note du professeur : toujours utiliser ON DELETE CASCADE si précisé.",
    );

    expect(ctx).toContain("FOREIGN KEY");
    expect(ctx).toContain("ON DELETE CASCADE");
  });

  it("extrait proprement le bloc de code et détecte le repli honnête dans parseGeminiTutorAnswer", () => {
    const parsed = parseGeminiTutorAnswer(
      "Voici comment déclarer une clé étrangère :\n```sql\nFOREIGN KEY (cin) REFERENCES client(cin)\n```\nCela garantit l'intégrité.",
      "sql",
    );

    expect(parsed.isFallback).toBe(false);
    expect(parsed.codeSnippet).toBe("FOREIGN KEY (cin) REFERENCES client(cin)");
    expect(parsed.answer).not.toContain("```");
    expect(parsed.answer).toContain("intégrité");

    const fallback = parseGeminiTutorAnswer(
      "Je n'ai pas de fiche sur ce sujet dans le programme STI.",
      "html5",
    );
    expect(fallback.isFallback).toBe(true);
  });

  it("interroge l'API Gemini via l'en-tête x-goog-api-key avec le corpus STI en contexte", async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: "Une jointure **LEFT JOIN** conserve toutes les lignes de la table de gauche.\n```sql\nSELECT c.nom, l.numloc FROM client c LEFT JOIN location l ON c.cin = l.cin;\n```",
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await queryGeminiCourseTutor({
      query: "explique la jointure externe LEFT JOIN",
      activeCategoryId: "sql",
      apiKey: "test-server-secret-key",
      fetchImpl: mockFetch,
    });

    expect(res.mode).toBe("gemini");
    expect(res.source.answer).toContain("LEFT JOIN");
    expect(res.source.codeSnippet).toContain("LEFT JOIN location");
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(String(url)).toContain("gemini-2.5-flash:generateContent");
    expect(String(url)).not.toContain("test-server-secret-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-server-secret-key",
    );
  });

  it("bascule gracieusement sur la base locale en cas d'erreur HTTP ou réseau de Gemini", async () => {
    const failingFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Quota exceeded", { status: 429 }));

    const res = await queryGeminiCourseTutor({
      query: "c'est quoi une clé étrangère",
      activeCategoryId: "sql",
      apiKey: "test-server-secret-key",
      fetchImpl: failingFetch,
    });

    expect(res.mode).toBe("local");
    expect(res.source.id).toBe("kb-sql-cle-etrangere");
  });
});
