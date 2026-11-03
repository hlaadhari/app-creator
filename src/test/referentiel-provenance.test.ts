import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { contentSubjects } from "../lib/content/all-subjects";
import { exercises } from "../lib/exercises";

describe("PED-01: Référentiel STI, Taxonomie et Traçabilité des Sujets (Issue #131)", () => {
  const contentDir = path.resolve(process.cwd(), "content");
  const subjectFolders = fs.readdirSync(contentDir).filter((d) => {
    return fs.statSync(path.join(contentDir, d)).isDirectory();
  });

  it("vérifie que le catalogue contient au moins 10 sujets référencés", () => {
    expect(contentSubjects.length).toBeGreaterThanOrEqual(10);
  });

  it("garantit que chaque sujet du catalogue possède une taxonomie et une provenance complètes", () => {
    for (const s of contentSubjects) {
      expect(s.referentielId).toBe("bac-si-tn");
      expect(s.statutValidation).toBe("valide_pedagogiquement");
      expect(s.sourceReference).toBeDefined();
      expect(typeof s.sourceReference).toBe("string");
      expect(s.sourceReference!.length).toBeGreaterThan(0);

      expect(["exercice", "tp", "annale_officielle", "annale_adaptee", "sujet_original"]).toContain(
        s.typeSujet,
      );

      if (s.typeSujet === "annale_officielle" || s.typeSujet === "annale_adaptee") {
        expect(s.sessionAnnee).toBeGreaterThanOrEqual(2018);
        expect(s.sessionLibelle).toBeDefined();
      }
    }
  });

  it("garantit que tous les fichiers manifest.json dans content/ sont conformes à la taxonomie", () => {
    for (const folder of subjectFolders) {
      const manifestPath = path.join(contentDir, folder, "manifest.json");
      expect(fs.existsSync(manifestPath), `manifest.json manquant dans ${folder}`).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      expect(manifest.id).toBe(folder);
      expect(manifest.referentiel_id).toBe("bac-si-tn");
      expect(["exercice", "tp", "annale_officielle", "annale_adaptee", "sujet_original"]).toContain(
        manifest.type_sujet,
      );
      expect(manifest.source_reference).toBeDefined();
      expect(manifest.statut_validation).toBe("valide_pedagogiquement");

      if (manifest.type_sujet === "annale_officielle" || manifest.type_sujet === "annale_adaptee") {
        expect(manifest.session_annee).toBeGreaterThanOrEqual(2018);
        expect(manifest.session_libelle).toBeDefined();
      }
    }
  });

  it("vérifie l'absence de mentions STI2D dans le catalogue, les énoncés et les starters", () => {
    for (const s of contentSubjects) {
      expect(s.title).not.toMatch(/sti2d/i);
      expect(s.competence).not.toMatch(/sti2d/i);
      expect(s.enonceMarkdown).not.toMatch(/sti2d/i);

      for (const [fichier, contenu] of Object.entries(s.starter)) {
        expect(
          contenu,
          `Mention STI2D interdite dans le starter ${fichier} du sujet ${s.id}`,
        ).not.toMatch(/sti2d/i);
      }
    }
  });

  it("vérifie que le fichier de documentation docs/REFERENTIEL.md existe et explicite le cadre tunisien", () => {
    const docPath = path.resolve(process.cwd(), "docs", "REFERENTIEL.md");
    expect(fs.existsSync(docPath)).toBe(true);
    const content = fs.readFileSync(docPath, "utf-8");
    expect(content).toContain("4ème SI");
    expect(content).toContain("Systèmes et Technologies de l'Informatique");
    expect(content).toContain("bac-si-tn");
    expect(content).toContain("annale_officielle");
  });

  it("vérifie la migration SQL 0024 pour la table referentiels et les colonnes de provenance", () => {
    const migrationPath = path.resolve(
      process.cwd(),
      "supabase",
      "migrations",
      "20261023200000_0024_referentiels_et_provenance.sql",
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, "utf-8");
    expect(sql).toContain("create table if not exists public.referentiels");
    expect(sql).toContain("grant select on public.referentiels to anon, authenticated;");
    expect(sql).toContain("alter table public.sujets");
    expect(sql).toContain("referentiel_id");
    expect(sql).toContain("type_sujet");
    expect(sql).toContain("session_annee");
    expect(sql).toContain("source_reference");
  });
});
