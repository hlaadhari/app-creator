import { describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import { evaluateCriteria, type CriterionDefinition } from "@/lib/evaluation/probe-runner";
import { debloquerNiveauIndice, getNombreIndices } from "@/lib/evaluation/hints-service";
import { SqliteEngine } from "@/lib/sql/sqlite-engine";
import { contentSubjects } from "@/lib/content/all-subjects";

interface Manifest {
  id: string;
  titre: string;
  module: string;
  duree_minutes: number;
  niveau: number;
  exam_mode: boolean;
  bareme: number;
  tags: string[];
  fichiers_attendus: string[];
  base_de_donnees: string;
}

interface Criterion {
  id: string;
  code: string;
  titre: string;
  points: number;
  fail_message: string;
  fichier: string;
  /** Absente pour les critères à vérification déclarée (js_test_cas…) : voir le banc de notation. */
  sonde?: { type: string; selector?: string };
  [key: string]: unknown;
}

const CONTENT_DIR = path.resolve(__dirname, "../../content");

const EXAMS = [
  {
    id: "exam-bac2025-droits-acces",
    tables: ["document", "utilisateur", "droit"],
    foreignKeys: 2,
    phpMessages: {
      "ajout.php": ["Utilisateur ajouté avec succès", "Erreur d'insertion des données"],
      "droit.php": [
        "Erreur : Utilisateur inexistant",
        "Mise à jour des droits d'accès réussie",
        "Insertion des droits d'accès réussie",
      ],
      "affichage.php": ["Les droits d'accès relatifs au document"],
    },
  },
  {
    id: "exam-bac2026-bijoux-aurythia",
    tables: ["bijou", "metal", "composition", "expert", "evaluation"],
    foreignKeys: 4,
    phpMessages: {
      "ajout.php": ["Ajout effectué avec succès", "Erreur d'insertion"],
      "evaluation.php": [
        "Bijou inexistant",
        "Bijou déjà évalué par cet expert",
        "Evaluation enregistrée avec succès",
      ],
      "liste.php": ["AVG(", "GROUP BY", "originalite = 'O'"],
    },
  },
  {
    id: "exam-bac2026-croisieres-marivana",
    tables: ["navire", "destination", "croisiere", "client", "reservation"],
    foreignKeys: 4,
    phpMessages: {
      "connexion.php": ["mysqli_connect"],
      "croisiere.php": ["Aucune croisière programmée pour cette période", "ORDER BY c.dateDepart"],
      "reservation.php": [
        "Réservation déjà faite",
        "Réservation enregistrée dans l'attente de confirmation",
        "ucwords(trim(",
      ],
    },
  },
];

const read = (...parts: string[]) => fs.readFileSync(path.join(CONTENT_DIR, ...parts), "utf-8");
const readManifest = (id: string): Manifest => JSON.parse(read(id, "manifest.json"));
const readCriteria = (id: string): Criterion[] => JSON.parse(read(id, "criteria.json"));

/** Charge une page de initial/ ou solution/ avec ses feuilles de style liées appliquées. */
function loadPage(id: string, variant: "initial" | "solution", page: string) {
  const dir = path.join(CONTENT_DIR, id, variant);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, page), "utf-8"), {
    runScripts: "outside-only",
  });
  const doc = dom.window.document;
  doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const css = path.join(dir, link.getAttribute("href") ?? "");
    if (fs.existsSync(css)) {
      const style = doc.createElement("style");
      style.textContent = fs.readFileSync(css, "utf-8");
      doc.head.appendChild(style);
    }
  });
  return dom;
}

type FonctionGlobale = (...args: unknown[]) => unknown;

const fonctionGlobale = (win: Window, nom: string): FonctionGlobale | undefined => {
  const fn = (win as unknown as Record<string, unknown>)[nom];
  return typeof fn === "function" ? (fn as FonctionGlobale) : undefined;
};

/** Appelle une fonction globale définie par le script chargé dans la fenêtre. */
const appel = (win: Window, nom: string, ...args: unknown[]): unknown => {
  const fn = fonctionGlobale(win, nom);
  if (!fn) throw new Error(`Fonction ${nom} non définie`);
  return fn.apply(win, args);
};

/** Charge une page et exécute le JavaScript de la variante indiquée dans la fenêtre. */
function loadPageWithScript(id: string, variant: "initial" | "solution", page: string, js: string) {
  const dom = loadPage(id, variant, page);
  (dom.window as unknown as { eval: (code: string) => unknown }).eval(read(id, variant, js));
  const win = dom.window as unknown as Window;
  const alertMock = vi.fn();
  (win as unknown as { alert: unknown }).alert = alertMock;
  return { dom, win, doc: dom.window.document, alertMock };
}

const isPlaceholder = (c: Criterion) =>
  !c.sonde ||
  c["correction"] === "enseignant" ||
  (c.sonde.type === "dom_selector" && c.sonde.selector === "body");

function earnedPoints(id: string, variant: "initial" | "solution") {
  let earned = 0;
  let total = 0;
  for (const c of readCriteria(id).filter((x) => !isPlaceholder(x))) {
    const dom = loadPage(id, variant, c.fichier);
    const def: CriterionDefinition = {
      id: c.id,
      code: c.code,
      label: c.titre,
      points: c.points,
      ordre: 1,
      sonde: c.sonde as CriterionDefinition["sonde"],
      message_echec: c.fail_message,
    };
    const summary = evaluateCriteria([def], dom.window.document, dom.window as unknown as Window);
    earned += summary.earnedPoints;
    total += c.points;
  }
  return { earned, total };
}

const setValue = (doc: Document, id: string, value: string) => {
  (doc.getElementById(id) as HTMLInputElement | HTMLSelectElement).value = value;
};
const setChecked = (doc: Document, id: string, checked: boolean) => {
  (doc.getElementById(id) as HTMLInputElement).checked = checked;
};

describe("Contenu Module C – Annales Bac STI 2025 et 2026 (Niveau 3)", () => {
  EXAMS.forEach((exam) => {
    describe(`Paquet : ${exam.id}`, () => {
      const manifest = readManifest(exam.id);
      const criteria = readCriteria(exam.id);

      it("possède un manifest.json conforme aux métadonnées d'examen", () => {
        expect(manifest.id).toBe(exam.id);
        expect(manifest.module).toBe("Module C");
        expect(manifest.duree_minutes).toBe(120);
        expect(manifest.niveau).toBe(3);
        expect(manifest.exam_mode).toBe(true);
        expect(manifest.bareme).toBe(20);
        expect(manifest.base_de_donnees).toBe("db/init.sql");
        expect(manifest.tags).toEqual(
          expect.arrayContaining(["Bac STI", "HTML5", "CSS3", "JavaScript", "PHP", "MySQLi"]),
        );
      });

      it("fournit chaque fichier attendu dans initial/ et un corrigé complet dans solution/", () => {
        manifest.fichiers_attendus.forEach((f) => {
          expect(fs.existsSync(path.join(CONTENT_DIR, exam.id, "initial", f)), `initial/${f}`).toBe(
            true,
          );
          expect(read(exam.id, "solution", f).length, `solution/${f}`).toBeGreaterThan(30);
        });
      });

      it("possède un énoncé avec contexte, travail demandé et barème sur 20 points", () => {
        const enonce = read(exam.id, "enonce.md");
        expect(enonce).toContain("## Contexte");
        expect(enonce).toContain("## Travail Demandé");
        expect(enonce).toContain("## Barème Officiel");
        expect(enonce).toContain("20 points");
      });

      it("possède un barème totalisant exactement 20 points, chaque critère étant évaluable", () => {
        expect(criteria.length).toBeGreaterThanOrEqual(6);
        expect(criteria.reduce((sum, c) => sum + c.points, 0)).toBe(20);
        const ids = new Set(criteria.map((c) => c.id));
        expect(ids.size).toBe(criteria.length);
        criteria.forEach((c) => {
          expect(c.points).toBeGreaterThan(0);
          expect(c.fail_message).toBeTruthy();
          expect(manifest.fichiers_attendus).toContain(c.fichier);
        });
      });

      it("fournit un script SQL complet : tables, clés primaires, clés étrangères, données", () => {
        const sql = read(exam.id, "db", "init.sql");
        exam.tables.forEach((t) => expect(sql).toContain(`CREATE TABLE \`${t}\``));
        expect((sql.match(/CREATE TABLE/g) ?? []).length).toBe(exam.tables.length);
        expect((sql.match(/PRIMARY KEY/g) ?? []).length).toBe(exam.tables.length);
        expect((sql.match(/FOREIGN KEY/g) ?? []).length).toBe(exam.foreignKeys);
        expect(sql).toContain("INSERT INTO");
      });

      it("s'injecte sans erreur dans le moteur SQL de la sandbox, avec toutes les lignes", async () => {
        const engine = new SqliteEngine();
        const results = await engine.loadSql(read(exam.id, "db", "init.sql"));
        expect(results.find((r) => r.error)?.error).toBeUndefined();

        const inserts = (read(exam.id, "db", "init.sql").match(/INSERT INTO/g) ?? []).length;
        const tables = await engine.getTables();
        expect(tables.map((t) => t.name).sort()).toEqual([...exam.tables].sort());
        expect(tables.reduce((n, t) => n + t.rowCount, 0)).toBe(inserts);
      });

      it("contient dans chaque script PHP du corrigé les messages et requêtes de l'énoncé", () => {
        Object.entries(exam.phpMessages).forEach(([file, snippets]) => {
          const php = read(exam.id, "solution", file);
          expect(php.startsWith("<?php")).toBe(true);
          snippets.forEach((s) => expect(php, `${file} : ${s}`).toContain(s));
        });
      });

      it("est enregistré dans le catalogue en mode examen avec le même barème et les mêmes fichiers", () => {
        const subject = contentSubjects.find((s) => s.id === exam.id);
        expect(subject).toBeDefined();
        expect(subject?.examMode).toBe(true);
        expect(subject?.module).toBe("Module C");
        expect(subject?.dureeMinutes).toBe(120);
        expect(subject?.criteria.reduce((n, c) => n + c.points, 0)).toBe(20);
        expect(subject?.criteria.length).toBe(criteria.length);
        expect(Object.keys(subject?.starter ?? {}).sort()).toEqual(
          [...manifest.fichiers_attendus, "db/init.sql"].sort(),
        );
        expect(subject?.starter["db/init.sql"]).toBe(read(exam.id, "db", "init.sql"));
        expect(subject?.enonceMarkdown).toBe(read(exam.id, "enonce.md"));
      });

      it("neutralise le tuteur IA et les indices en mode examen", async () => {
        expect(await getNombreIndices(exam.id)).toBe(0);
        const res = await debloquerNiveauIndice(exam.id, 1);
        expect(res.success).toBe(false);
        expect(res.error).toContain("Le système d'indices est désactivé en mode examen");
      });

      it("le corrigé satisfait toutes les sondes du DOM, le point de départ n'en satisfait pas autant", () => {
        const solution = earnedPoints(exam.id, "solution");
        const initial = earnedPoints(exam.id, "initial");
        expect(solution.total).toBeGreaterThan(0);
        expect(solution.earned).toBe(solution.total);
        expect(initial.earned).toBeLessThan(solution.earned);
      });
    });
  });

  describe("Bac 2025 – comportement de mesControles.js", () => {
    const id = "exam-bac2025-droits-acces";

    it("verif1 accepte un utilisateur valide et refuse les identifiants et noms invalides", () => {
      const { win, doc, alertMock } = loadPageWithScript(
        id,
        "solution",
        "utilisateur.html",
        "mesControles.js",
      );
      const essai = (idUtil: string, nom: string) => {
        setValue(doc, "idUtil", idUtil);
        setValue(doc, "nomPrenom", nom);
        return appel(win, "verif1");
      };

      expect(essai("U123", "Ali Ben Salah")).toBe(true);
      expect(alertMock).not.toHaveBeenCalled();

      expect(essai("X123", "Ali Ben Salah")).toBe(false);
      expect(essai("U12", "Ali Ben Salah")).toBe(false);
      expect(essai("U12A", "Ali Ben Salah")).toBe(false);
      expect(essai("U1234", "Ali Ben Salah")).toBe(false);
      expect(essai("U123", "Ali")).toBe(false);
      expect(essai("U123", "Ali Ben 3")).toBe(false);
      expect(essai("U123", "A".repeat(51))).toBe(false);
      expect(essai("U123", "")).toBe(false);
      expect(alertMock).toHaveBeenCalledTimes(7 + 1);
    });

    it("verif2 exige un document et au moins un droit", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "droit.html", "mesControles.js");
      setValue(doc, "doc", "");
      setChecked(doc, "lecture", true);
      expect(appel(win, "verif2")).toBe(false);

      setValue(doc, "doc", "D0001");
      setChecked(doc, "lecture", false);
      expect(appel(win, "verif2")).toBe(false);

      setChecked(doc, "lecture", true);
      expect(appel(win, "verif2")).toBe(true);
    });

    it("choix1, choix2 et choix3 maintiennent la cohérence des droits", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "droit.html", "mesControles.js");
      const etat = () =>
        ["ecriture", "lecture", "impression"].map(
          (c) => (doc.getElementById(c) as HTMLInputElement).checked,
        );

      setChecked(doc, "ecriture", true);
      appel(win, "choix1");
      expect(etat()).toEqual([true, true, false]);

      setChecked(doc, "impression", true);
      appel(win, "choix3");
      expect(etat()).toEqual([true, true, true]);

      setChecked(doc, "lecture", false);
      appel(win, "choix2");
      expect(etat()).toEqual([false, false, false]);

      setChecked(doc, "impression", true);
      appel(win, "choix3");
      expect(etat()).toEqual([false, true, true]);
    });

    it("le point de départ ne fournit pas les fonctions à développer", () => {
      const { win } = loadPageWithScript(id, "initial", "droit.html", "mesControles.js");
      expect(fonctionGlobale(win, "verif2")).toBeUndefined();
      expect(fonctionGlobale(win, "alpha")).toBeDefined();
    });
  });

  describe("Bac 2026 (bijoux) – comportement de mesControles.js", () => {
    const id = "exam-bac2026-bijoux-aurythia";

    it("valide1 contrôle identifiant, prix et composition, et colore la composition invalide", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "ajout.html", "mesControles.js");
      const essai = (idBij: string, prix: string, metaux: boolean) => {
        setValue(doc, "idBij", idBij);
        setValue(doc, "prix", prix);
        setChecked(doc, "c1", metaux);
        return appel(win, "valide1");
      };
      const compo = doc.getElementById("composition") as HTMLElement;

      expect(essai("ab123", "100", true)).toBe(true);
      expect(compo.style.backgroundColor).toBe("");

      expect(essai("a1234", "500", true)).toBe(false);
      expect(essai("ab12", "500", true)).toBe(false);
      expect(essai("abc12", "500", true)).toBe(false);
      expect(essai("ab123", "99", true)).toBe(false);
      expect(essai("ab123", "", true)).toBe(false);
      expect(essai("ab123", "500", false)).toBe(false);
      expect(compo.style.backgroundColor).toBe("red");
    });

    it("valide2 contrôle expert, finition, originalité et commentaire", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "evaluation.html", "mesControles.js");
      const essai = (
        o: Partial<{
          idBij: string;
          expert: string;
          finition: string;
          oui: boolean;
          commentaire: string;
        }> = {},
      ) => {
        const v = {
          idBij: "ab123",
          expert: "A22",
          finition: "3",
          oui: true,
          commentaire: "Tres joli bijou",
          ...o,
        };
        setValue(doc, "idBij", v.idBij);
        setValue(doc, "expert", v.expert);
        setValue(doc, "finition", v.finition);
        setChecked(doc, "oui", v.oui);
        setChecked(doc, "non", false);
        setValue(doc, "commentaire", v.commentaire);
        return appel(win, "valide2");
      };

      expect(essai()).toBe(true);
      expect(essai({ commentaire: "  Tres   joli   bijou  " })).toBe(true);
      expect(essai({ commentaire: "Très élégant" })).toBe(true);
      expect(essai({ finition: "1" })).toBe(true);
      expect(essai({ finition: "5" })).toBe(true);

      expect(essai({ idBij: "ab12" })).toBe(false);
      expect(essai({ expert: "" })).toBe(false);
      expect(essai({ finition: "0" })).toBe(false);
      expect(essai({ finition: "6" })).toBe(false);
      expect(essai({ finition: "2.5" })).toBe(false);
      expect(essai({ finition: "" })).toBe(false);
      expect(essai({ oui: false })).toBe(false);
      expect(essai({ commentaire: "joli" })).toBe(false);
      expect(essai({ commentaire: "joli 2bijou" })).toBe(false);
      expect(essai({ commentaire: "   " })).toBe(false);
    });

    it("la case Non satisfait aussi le contrôle d'originalité", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "evaluation.html", "mesControles.js");
      setValue(doc, "idBij", "ab123");
      setValue(doc, "expert", "A23");
      setValue(doc, "finition", "4");
      setChecked(doc, "oui", false);
      setChecked(doc, "non", true);
      setValue(doc, "commentaire", "Bien fait");
      expect(appel(win, "valide2")).toBe(true);
    });
  });

  describe("Bac 2026 (croisières) – comportement de controles2.js", () => {
    const id = "exam-bac2026-croisieres-marivana";

    const jour = (decalage: number) => {
      const d = new Date();
      d.setDate(d.getDate() + decalage);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${mm}-${dd}`;
    };

    it("verif1 impose une destination, Date 1 > aujourd'hui et Date 2 > Date 1", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "croisiere.html", "controles2.js");
      const essai = (dest: string, d1: string, d2: string) => {
        setValue(doc, "dest", dest);
        setValue(doc, "DD", d1);
        setValue(doc, "DF", d2);
        return appel(win, "verif1");
      };

      expect(essai("1", jour(1), jour(2))).toBe(true);
      expect(essai("2", jour(30), jour(60))).toBe(true);

      expect(essai("", jour(1), jour(2))).toBe(false);
      expect(essai("1", jour(0), jour(2))).toBe(false);
      expect(essai("1", jour(-3), jour(2))).toBe(false);
      expect(essai("1", jour(5), jour(5))).toBe(false);
      expect(essai("1", jour(5), jour(4))).toBe(false);
      expect(essai("1", "", jour(4))).toBe(false);
      expect(essai("1", jour(1), "")).toBe(false);
    });

    it("nombres affiche la valeur du champ suivie de /10", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "reservation.html", "controles2.js");
      setValue(doc, "nbPlace", "7");
      appel(win, "nombres");
      expect(doc.getElementById("nb")?.textContent).toBe("7/10");
      setValue(doc, "nbPlace", "10");
      appel(win, "nombres");
      expect(doc.getElementById("nb")?.textContent).toBe("10/10");
    });

    it("verif2 contrôle le type d'identifiant, l'identifiant et le nom", () => {
      const { win, doc } = loadPageWithScript(id, "solution", "reservation.html", "controles2.js");
      const essai = (type: string, idCl: string, nom: string) => {
        setValue(doc, "typeId", type);
        setValue(doc, "idCl", idCl);
        setValue(doc, "nomCl", nom);
        return appel(win, "verif2");
      };

      expect(essai("CIN", "01234567", "Najla Soussi")).toBe(true);
      expect(essai("Passeport", "A123456789", "Kamel Nebli")).toBe(true);
      expect(essai("Passeport", "a123456789", "Sami Ben Ali")).toBe(true);

      expect(essai("", "01234567", "Najla Soussi")).toBe(false);
      expect(essai("CIN", "1234567", "Najla Soussi")).toBe(false);
      expect(essai("CIN", "123456789", "Najla Soussi")).toBe(false);
      expect(essai("CIN", "1234567A", "Najla Soussi")).toBe(false);
      expect(essai("Passeport", "12345678", "Najla Soussi")).toBe(false);
      expect(essai("Passeport", "A12345678", "Najla Soussi")).toBe(false);
      expect(essai("CIN", "01234567", "Ali Ben")).toBe(false);
      expect(essai("CIN", "01234567", "Ali Ben1")).toBe(false);
      expect(essai("CIN", "01234567", "")).toBe(false);
    });
  });
});
