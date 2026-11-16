import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { queryGeminiCourseTutor } from "@/lib/tutor/course-gemini";

const CourseTutorInputSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  activeCategoryId: z.enum(["html5", "css3", "js", "php", "sql", "annales"]).default("html5"),
});

export type CourseTutorInput = z.infer<typeof CourseTutorInputSchema>;

/**
 * Fonction serveur TanStack Start pour le Tuteur du Cours (/cours).
 * Lit `GEMINI_API_KEY` uniquement côté serveur (jamais exposée au client).
 * Si aucune clé n'est configurée ou si l'API échoue, bascule automatiquement
 * sur la base de connaissances locale `queryNotebookKnowledgeBase`.
 */
export const askCourseNotebookTutor = createServerFn({ method: "POST" })
  .validator((raw: unknown): CourseTutorInput => CourseTutorInputSchema.parse(raw))
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    const model = process.env["GEMINI_TUTOR_MODEL"];
    const extraCorpus = process.env["NOTEBOOKLM_CORPUS"];

    return queryGeminiCourseTutor({
      query: data.query,
      activeCategoryId: data.activeCategoryId,
      apiKey,
      model,
      extraCorpus,
    });
  });
