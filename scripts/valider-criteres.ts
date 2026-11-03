import fs from "node:fs";
import path from "node:path";
import { CriteriaListSchema } from "../src/lib/evaluation/criteria-schema";

const CONTENT_DIR = path.resolve(process.cwd(), "content");

function validerCriteresBuild() {
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

  if (hasErrors) {
    console.error("\n[valider-criteres] Echec : des criteres sont non conformes.");
    process.exit(1);
  }

  console.log(
    "[TEC-06] Succes : " +
      dossiers.length +
      " fichiers valides avec succes (" +
      totalCriteres +
      " criteres au total).\n",
  );
}

validerCriteresBuild();
