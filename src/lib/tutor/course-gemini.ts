import { MEMENTO_CARDS } from "@/content/mementos";
import {
  NOTEBOOK_KNOWLEDGE_BASE,
  queryNotebookKnowledgeBase,
  type NotebookCategoryId,
  type NotebookKnowledgeSource,
} from "@/content/notebook-sti";

/**
 * URL publique du NotebookLM partagé par l'enseignant (pour consultation directe dans le navigateur).
 */
export const NOTEBOOK_LM_PUBLIC_URL =
  "https://notebook.google.com/notebook/a42c871a-969a-42a2-8bb3-af3be46fcd65";

export const DEFAULT_GEMINI_TUTOR_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_TIMEOUT_MS = 10_000;

export interface CourseGeminiTutorOptions {
  query: string;
  activeCategoryId: NotebookCategoryId;
  apiKey?: string | undefined;
  model?: string | undefined;
  extraCorpus?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
}

export interface CourseGeminiTutorResponse {
  mode: "gemini" | "local";
  source: NotebookKnowledgeSource;
}

/**
 * Construit le contexte de référence pédagogique (Grounding) à partir :
 * 1. De la fiche la plus pertinente de `NOTEBOOK_KNOWLEDGE_BASE`
 * 2. Des extraits du module actif dans `NOTEBOOK_KNOWLEDGE_BASE` et `MEMENTO_CARDS`
 * 3. D'un éventuel corpus exporté depuis NotebookLM (`extraCorpus`)
 */
export function buildCourseGroundingContext(
  query: string,
  activeCategoryId: NotebookCategoryId,
  extraCorpus?: string,
): string {
  const sections: string[] = [];

  const primary = queryNotebookKnowledgeBase(query, activeCategoryId);
  if (!primary.isFallback) {
    sections.push(
      `### Fiche la plus pertinente : ${primary.title}\nSource : ${primary.sourceRef}\n${primary.answer}${
        primary.codeSnippet ? `\n\`\`\`\n${primary.codeSnippet}\n\`\`\`` : ""
      }`,
    );
  }

  const moduleEntries = NOTEBOOK_KNOWLEDGE_BASE.filter(
    (entry) => entry.moduleId === activeCategoryId && entry.id !== primary.id,
  ).slice(0, 4);

  for (const entry of moduleEntries) {
    sections.push(
      `### ${entry.title}\n${entry.answer}${
        entry.codeSnippet ? `\n\`\`\`\n${entry.codeSnippet}\n\`\`\`` : ""
      }`,
    );
  }

  const activeMemento = MEMENTO_CARDS.find((card) => card.id === activeCategoryId);
  if (activeMemento) {
    const snippetsSummary = activeMemento.sections
      .slice(0, 3)
      .map(
        (sec) =>
          `- **${sec.title}** : ${sec.description} (${sec.snippets
            .slice(0, 2)
            .map((s) => s.title)
            .join(", ")})`,
      )
      .join("\n");
    sections.push(
      `### Mémento ${activeMemento.title}\nPiège Bac : ${activeMemento.piegeBac}\n${snippetsSummary}`,
    );
  }

  if (extraCorpus && extraCorpus.trim().length > 0) {
    sections.push(
      `### Sources complémentaires NotebookLM STI\n${extraCorpus.trim().slice(0, 6000)}`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Extrait un éventuel bloc de code Markdown (```lang ... ```) de la réponse Gemini
 * pour l'afficher proprement dans l'encart code du tuteur `/cours`.
 */
export function parseGeminiTutorAnswer(
  rawText: string,
  activeCategoryId: NotebookCategoryId,
): NotebookKnowledgeSource {
  const trimmed = rawText.trim();
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/;
  const match = codeBlockRegex.exec(trimmed);

  let answer = trimmed;
  let codeSnippet: string | undefined;

  if (match && match[1]) {
    codeSnippet = match[1].trim();
    answer = trimmed
      .replace(codeBlockRegex, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const normalizedLower = answer.toLowerCase();
  const isFallback =
    normalizedLower.includes("je n'ai pas de fiche sur ce sujet") ||
    normalizedLower.includes("hors du programme") ||
    normalizedLower.includes("hors programme");

  return {
    id: isFallback ? "kb-fallback-gemini" : `kb-gemini-${activeCategoryId}`,
    moduleId: activeCategoryId,
    isFallback,
    title: isFallback
      ? "Sujet hors programme STI"
      : `Réponse Gemini • Carnet STI (${activeCategoryId.toUpperCase()})`,
    sourceRef: "Gemini API (serveur) • Corpus Carnet STI-BAC INFO",
    keywords: [],
    answer: answer || "Je n'ai pas pu formuler de réponse pour cette question.",
    ...(codeSnippet ? { codeSnippet } : {}),
    followUps: isFallback
      ? [
          "C'est quoi une clé étrangère ?",
          "Explique la jointure externe LEFT JOIN",
          "Comment faire un tableau HTML ?",
        ]
      : [
          "Donne-moi un piège fréquent au Bac sur cette notion",
          "Comment contrôler un CIN de 8 chiffres en JS ?",
        ],
  };
}

interface GeminiCandidatePart {
  text?: string | undefined;
}

interface GeminiCandidate {
  content?:
    | {
        parts?: GeminiCandidatePart[] | undefined;
      }
    | undefined;
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[] | undefined;
}

/**
 * Interroge l'API officielle Gemini côté serveur en s'appuyant sur le corpus du Carnet STI.
 * En l'absence de `GEMINI_API_KEY` ou en cas d'erreur réseau/API, bascule automatiquement
 * sur le moteur local `queryNotebookKnowledgeBase` sans bloquer l'élève.
 */
export async function queryGeminiCourseTutor(
  options: CourseGeminiTutorOptions,
): Promise<CourseGeminiTutorResponse> {
  const { query, activeCategoryId, apiKey, model, extraCorpus, fetchImpl = fetch } = options;
  const cleanQuery = query.trim();

  if (!cleanQuery || !apiKey || apiKey.trim().length === 0) {
    return {
      mode: "local",
      source: queryNotebookKnowledgeBase(cleanQuery, activeCategoryId),
    };
  }

  const groundingContext = buildCourseGroundingContext(cleanQuery, activeCategoryId, extraCorpus);
  const selectedModel =
    model && model.trim().length > 0 ? model.trim() : DEFAULT_GEMINI_TUTOR_MODEL;

  const systemInstruction = [
    "Tu es le Tuteur Pédagogique du Carnet STI-BAC INFO (4ème année Sciences de l'Informatique, Bac STI Tunisie).",
    "Règles strictes :",
    "1. Réponds en français clair, concis et structuré à partir du corpus de cours fourni ci-dessous et du programme officiel 4ème STI (HTML5, CSS3, JavaScript DOM, PHP MySQLi procédural, Bases de données & SQL).",
    "2. En PHP, utilise EXCLUSIVEMENT l'extension MySQLi procédurale (`mysqli_connect`, `mysqli_query`, `mysqli_num_rows`, `mysqli_fetch_array`, `mysqli_affected_rows`, `mysqli_close`). N'utilise jamais PDO ni l'objet `$mysqli->query`.",
    "3. Si la question est une simple salutation (ex. « bonjour ») ou est totalement hors du programme STI (ex. cuisine, météo, sport), réponds honnêtement : « Je n'ai pas de fiche sur ce sujet dans le programme STI. » et propose des mots-clés du programme.",
    "4. Inclus au maximum un bloc de code court et propre (```lang ... ```) si un exemple illustre la réponse.",
  ].join("\n");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(selectedModel)}:generateContent`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey.trim(),
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Corpus de référence :\n${groundingContext}\n\nQuestion de l'élève :\n${cleanQuery}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 700,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        mode: "local",
        source: queryNotebookKnowledgeBase(cleanQuery, activeCategoryId),
      };
    }

    const payload = (await response.json()) as GeminiGenerateContentResponse;
    const rawText =
      payload.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("\n")
        .trim() ?? "";

    if (!rawText) {
      return {
        mode: "local",
        source: queryNotebookKnowledgeBase(cleanQuery, activeCategoryId),
      };
    }

    return {
      mode: "gemini",
      source: parseGeminiTutorAnswer(rawText, activeCategoryId),
    };
  } catch {
    return {
      mode: "local",
      source: queryNotebookKnowledgeBase(cleanQuery, activeCategoryId),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
