import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { CriteriaListSchema } from "../src/lib/evaluation/criteria-schema";
import { contentSubjects } from "../src/lib/content/all-subjects";
import { construireDocumentEvaluation } from "../src/lib/evaluation/document-evaluation";
import { evaluerParPage } from "../src/lib/evaluation/evaluation-par-page";
import { runCriteria, score } from "../src/lib/exercises";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

function lireDossier(dossier: string): Record<string, string> {
  const fichiers: Record<string, string> = {};
  if (!fs.existsSync(dossier)) return fichiers;

  function explorer(courant: string) {
    for (const nom of fs.readdirSync(courant)) {
      const chemin = path.join(courant, nom);
      const stat = fs.statSync(chemin);
      if (stat.isDirectory()) {
        explorer(chemin);
      } else if (stat.isFile()) {
        const clef = path.relative(dossier, chemin).replace(/\\/g, "/");
        const contenu = fs.readFileSync(chemin, "utf-8");
        fichiers[clef] = contenu;
        if (nom === "init.sql") {
          fichiers["init.sql"] = contenu;
          fichiers["db/init.sql"] = contenu;
        }
      }
    }
  }

  explorer(dossier);
  return fichiers;
}

async function validerCriteresBuild() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error("[valider-criteres] Repertoire content introuvable : " + CONTENT_DIR);
    process.exit(1);
  }

  const dossiers = fs.readdirSync(CONTENT_DIR).filter((dir) => {
    const full = path.join(CONTENT_DIR, dir);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "criteria.json"));
  });

  if (dossiers.length === 0) {
    console.error("[valider-criteres] Aucun fichier criteria.json trouve !");
    process.exit(1);
  }

  let totalCriteres = 0;
  let hasErrors = false;

  console.log(
    "==> [TEC-06] Validation stricte de " + dossiers.length + " fichiers criteria.json...",
  );

  for (const dossier of dossiers) {
    const filePath = path.join(CONTENT_DIR, dossier, "criteria.json");
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(raw);
      const result = CriteriaListSchema.safeParse(json);

      if (!result.success) {
        hasErrors = true;
        console.error("\nErreurs de validation dans " + dossier + "/criteria.json :");
        console.error(JSON.stringify(result.error.format(), null, 2));
      } else {
        totalCriteres += result.data.length;
      }
    } catch (err) {
      hasErrors = true;
      console.error("\nEchec de lecture pour " + dossier + "/criteria.json :", err);
    }
  }

  // Issue #190 : vérification que initial/ obtient 0 (ou score_initial_attendu) sur chaque sujet
  for (const sujet of contentSubjects) {
    const manifestPath = path.join(CONTENT_DIR, sujet.id, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      score_initial_attendu?: number;
    };
    const attendu = manifest.score_initial_attendu ?? 0;
    const fichiersInit = lireDossier(path.join(CONTENT_DIR, sujet.id, "initial"));

    const resultats = await evaluerParPage(sujet.criteria, fichiersInit, async (page, criteres) => {
      const dom = new JSDOM(construireDocumentEvaluation(fichiersInit, page), {
        runScripts: "dangerously",
      });
      try {
        return runCriteria(criteres, dom.window.document, dom.window as never);
      } finally {
        dom.window.close();
      }
    });
    const bilan = score(resultats);
    if (bilan.got !== attendu) {
      hasErrors = true;
      const reussis = resultats.filter((r) => r.ok).map((r) => r.id);
      console.error(
        `\n[valider-criteres] #190 Echec pour ${sujet.id} : initial/ obtient ${bilan.got} pt(s) (${reussis.join(", ")}) au lieu de ${attendu}.`,
      );
    }
  }

  if (hasErrors) {
    console.error("\n[valider-criteres] Echec : des criteres sont non conformes.");
    process.exit(1);
  }

  console.log(
    "[TEC-06] Succes : " +
      dossiers.length +
      " fichiers valides avec succes (" +
      totalCriteres +
      " criteres au total, initial/ = 0 sur tous les sujets).\n",
  );
}

void validerCriteresBuild();
