import { describe, it, expect } from "vitest";
import { COURSE_MODULES, type CourseModule } from "@/content/courses";

describe("Support de Cours Interactif & Mémento Bac STI (feat/course-support-html)", () => {
  it("charge les 5 modules officiels requis par le programme de 4ème SI", () => {
    expect(COURSE_MODULES).toHaveLength(5);
    const ids = COURSE_MODULES.map((m) => m.id);
    expect(ids).toEqual(["html5", "css3", "js", "php", "sql"]);
  });

  it("Module 1 (HTML5) contient la structure complète, formulaires et balises sémantiques", () => {
    const htmlMod = COURSE_MODULES.find((m) => m.id === "html5")!;
    expect(htmlMod).toBeDefined();
    expect(htmlMod.sections.length).toBeGreaterThanOrEqual(5);

    const html = htmlMod.rawHtml;
    expect(html).toContain("&lt;!DOCTYPE html");
    expect(html).toContain("&lt;form");
    expect(html).toContain("onsubmit=");
    expect(html).toContain("&lt;fieldset&gt;");
    expect(html).toContain("&lt;legend&gt;");
    expect(html).toContain('type="radio"');
    expect(html).toContain("&lt;select");
    expect(html).toContain("&lt;textarea");
    expect(html).toContain("&lt;header&gt;");
    expect(html).toContain("&lt;nav&gt;");
    expect(html).toContain("&lt;section&gt;");
    expect(html).toContain("&lt;article&gt;");
    expect(html).toContain("&lt;aside&gt;");
    expect(html).toContain("&lt;footer&gt;");
    expect(html).toContain("&lt;table");
    expect(html).toContain("&lt;iframe");
  });

  it("Module 2 (CSS3) contient les sélecteurs, le box model et les transitions", () => {
    const cssMod = COURSE_MODULES.find((m) => m.id === "css3")!;
    expect(cssMod).toBeDefined();

    const html = cssMod.rawHtml;
    expect(html).toContain("margin");
    expect(html).toContain("padding");
    expect(html).toContain("border-radius");
    expect(html).toContain("box-shadow");
    expect(html).toContain("position: relative");
    expect(html).toContain("position: absolute");
    expect(html).toContain("transform: scale");
    expect(html).toContain("transition");
    expect(html).toContain(":hover");
  });

  it("Module 3 (JavaScript) contient l'inclusion externe, manipulation DOM et la fonction canonique verif()", () => {
    const jsMod = COURSE_MODULES.find((m) => m.id === "js")!;
    expect(jsMod).toBeDefined();

    const html = jsMod.rawHtml;
    expect(html).toContain("controle.js");
    expect(html).toContain("document.getElementById");
    expect(html).toContain(".value");
    expect(html).toContain(".selectedIndex");
    expect(html).toContain(".checked");
    expect(html).toContain("alert(");
    expect(html).toContain("isNaN(");
    expect(html).toContain("function verif()");
    expect(html).toContain("8"); // Contrôle 8 chiffres CIN
    expect(html).toContain(".toUpperCase()");
  });

  it("Module 4 (PHP) contient les superglobales et l'interfaçage procédural MySQLi", () => {
    const phpMod = COURSE_MODULES.find((m) => m.id === "php")!;
    expect(phpMod).toBeDefined();

    const html = phpMod.rawHtml;
    expect(html).toContain("&lt;?php");
    expect(html).toContain("$_POST");
    expect(html).toContain("extract($_POST)");
    expect(html).toContain("mysqli_connect");
    expect(html).toContain("mysqli_query");
    expect(html).toContain("mysqli_num_rows");
    expect(html).toContain("mysqli_fetch_array");
    expect(html).toContain("mysqli_error");
    expect(html).toContain("mysqli_close");
  });

  it("Module 5 (SQL) contient le LDD, LMD, LID, contraintes et agrégats", () => {
    const sqlMod = COURSE_MODULES.find((m) => m.id === "sql")!;
    expect(sqlMod).toBeDefined();

    const html = sqlMod.rawHtml;
    expect(html).toContain("CREATE TABLE");
    expect(html).toContain("PRIMARY KEY");
    expect(html).toContain("FOREIGN KEY");
    expect(html).toContain("REFERENCES");
    expect(html).toContain("CHECK");
    expect(html).toContain("ALTER TABLE");
    expect(html).toContain("INSERT INTO");
    expect(html).toContain("UPDATE");
    expect(html).toContain("DELETE FROM");
    expect(html).toContain("SELECT");
    expect(html).toContain("GROUP BY");
    expect(html).toContain("HAVING");
    expect(html).toContain("AVG(");
    expect(html).toContain("COUNT(");
  });

  describe("Fiches Mémento Structurées & Pièges Bac STI (refactor/course-module-interactive)", () => {
    it("exporte les 5 fiches mémento avec métadonnées et icônes", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      expect(MEMENTO_CARDS).toHaveLength(5);
      const ids = MEMENTO_CARDS.map((f) => f.id);
      expect(ids).toEqual(["html5", "css3", "js", "php", "sql"]);
    });

    it("Fiche 1 (HTML5) contient le piège Bac sur l'attribut name et les formulaires", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      const f1 = MEMENTO_CARDS.find((f) => f.id === "html5")!;
      expect(f1).toBeDefined();
      expect(f1.piegeBac).toContain("name");
      expect(f1.piegeBac).toContain("$_POST");

      const allSnippets = f1.sections.flatMap((s) => s.snippets);
      expect(allSnippets.some((sn) => sn.code.includes('onsubmit="return verif();"'))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes('<script src="controle.js"'))).toBe(true);
    });

    it("Fiche 2 (CSS3) contient le piège Bac sur display: inline-block pour les labels", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      const f2 = MEMENTO_CARDS.find((f) => f.id === "css3")!;
      expect(f2).toBeDefined();
      expect(f2.piegeBac).toContain("display: inline-block;");
      expect(f2.piegeBac).toContain("<label>");

      const allSnippets = f2.sections.flatMap((s) => s.snippets);
      expect(allSnippets.some((sn) => sn.code.includes("display: inline-block;"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("transition:"))).toBe(true);
    });

    it("Fiche 3 (JS) contient le piège Bac sur return false pour bloquer la soumission", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      const f3 = MEMENTO_CARDS.find((f) => f.id === "js")!;
      expect(f3).toBeDefined();
      expect(f3.piegeBac).toContain("return false;");

      const allSnippets = f3.sections.flatMap((s) => s.snippets);
      expect(allSnippets.some((sn) => sn.code.includes("document.getElementById"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("length !== 8"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("selectedIndex"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("checked"))).toBe(true);
    });

    it("Fiche 4 (PHP) contient le piège Bac sur l'usage obligatoire de mysqli procédural", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      const f4 = MEMENTO_CARDS.find((f) => f.id === "php")!;
      expect(f4).toBeDefined();
      expect(f4.piegeBac).toContain("mysqli_*");

      const allSnippets = f4.sections.flatMap((s) => s.snippets);
      expect(allSnippets.some((sn) => sn.code.includes("mysqli_connect"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("mysqli_query"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("mysqli_num_rows"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("mysqli_fetch_array"))).toBe(true);
    });

    it("Fiche 5 (SQL) contient le piège Bac sur les guillemets VARCHAR/DATE en PHP", async () => {
      const { MEMENTO_CARDS } = await import("@/content/mementos");
      const f5 = MEMENTO_CARDS.find((f) => f.id === "sql")!;
      expect(f5).toBeDefined();
      expect(f5.piegeBac).toContain("guillemets");

      const allSnippets = f5.sections.flatMap((s) => s.snippets);
      expect(allSnippets.some((sn) => sn.code.includes("CREATE TABLE"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("PRIMARY KEY"))).toBe(true);
      expect(allSnippets.some((sn) => sn.code.includes("CHECK"))).toBe(true);
    });
  });

  describe("Intégration du Carnet STI-BAC INFO au Module /cours (feat/integrate-notebook-content-to-course-page)", () => {
    it("expose les 10 capsules vidéo générées couvrant tous les chapitres et les annales 2025/2026", async () => {
      const { NOTEBOOK_VIDEOS } = await import("@/content/notebook-sti");
      expect(NOTEBOOK_VIDEOS).toHaveLength(10);

      const titles = NOTEBOOK_VIDEOS.map((v) => v.title);
      expect(titles).toContain("Maitriser HTML5 & Formulaires");
      expect(titles).toContain("Architecte Web: CSS3 Bac");
      expect(titles).toContain("Maitriser CSS3");
      expect(titles).toContain("Étude de Cas CSS3 : Mise en Forme & Animations");
      expect(titles).toContain("JS : Gardien du Formulaire");
      expect(titles).toContain("PHP & MYSQL : Le Voyage");
      expect(titles).toContain("Maitriser BD & SQL");
      expect(titles).toContain("Correction Bac 2025 - Droits d'accès");
      expect(titles).toContain("Correction Bac 2026 - Bijoux Aurythia");
      expect(titles).toContain("Projet Web Full-Stack");
    });

    it("expose le Guide de Révision Synthétique - 4ème Bac STI et l'injection IDE vers SW_<NCIN>", async () => {
      const { REVISION_GUIDE_STI, injectSnippetIntoStudentIde } =
        await import("@/content/notebook-sti");
      expect(REVISION_GUIDE_STI.title).toBe("Guide de Révision Synthétique - 4ème Bac STI");
      expect(REVISION_GUIDE_STI.sections).toHaveLength(5);

      const res = injectSnippetIntoStudentIde(
        "function verif() { return true; }",
        "controle.js",
        "07451236",
      );
      expect(res.projectFolder).toBe("SW_07451236");
      expect(res.targetFile).toBe("controle.js");
    });

    it("associe au moins une capsule vidéo à chaque chapitre (html5, css3, js, php, sql, annales)", async () => {
      const { NOTEBOOK_VIDEOS } = await import("@/content/notebook-sti");
      for (const modId of ["html5", "css3", "js", "php", "sql", "annales"] as const) {
        const caps = NOTEBOOK_VIDEOS.filter((v) => v.moduleId === modId);
        expect(caps.length).toBeGreaterThanOrEqual(1);
        for (const c of caps) {
          expect(c.chapters.length).toBeGreaterThanOrEqual(1);
          expect(c.keyTakeaways.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("fournit des Flashcards de révision et des Quiz interactifs pour chaque module", async () => {
      const { NOTEBOOK_FLASHCARDS, NOTEBOOK_QUIZZES } = await import("@/content/notebook-sti");
      expect(NOTEBOOK_FLASHCARDS.length).toBeGreaterThanOrEqual(15);

      for (const modId of ["html5", "css3", "js", "php", "sql", "annales"] as const) {
        const cards = NOTEBOOK_FLASHCARDS.filter((c) => c.moduleId === modId);
        expect(cards.length).toBeGreaterThanOrEqual(1);

        const quiz = NOTEBOOK_QUIZZES[modId];
        expect(quiz).toBeDefined();
        expect(quiz.length).toBeGreaterThanOrEqual(2);
        for (const q of quiz) {
          expect(q.options.length).toBe(4);
          expect(q.correctIndex).toBeGreaterThanOrEqual(0);
          expect(q.correctIndex).toBeLessThan(4);
          expect(q.explanation.length).toBeGreaterThan(10);
        }
      }
    });

    it("connecte le Tuteur IA aux 262 sources du carnet STI-BAC INFO avec réponses alignées sur le programme", async () => {
      const { queryNotebookKnowledgeBase } = await import("@/content/notebook-sti");

      const rJs = queryNotebookKnowledgeBase(
        "Comment contrôler un CIN de 8 chiffres en JS ?",
        "js",
      );
      expect(rJs.answer).toContain("length");
      expect(rJs.answer).toContain("isNaN");

      const rPhp = queryNotebookKnowledgeBase("Syntaxe procédurale mysqli_query", "php");
      expect(rPhp.answer).toContain("mysqli_connect");
      expect(rPhp.answer).toContain("mysqli_num_rows");

      const rAnnales = queryNotebookKnowledgeBase(
        "Corrigé Bac 2026 Bijoux Aurythia et Bac 2025",
        "annales",
      );
      expect(rAnnales.answer).toContain("Bac 2025");
      expect(rAnnales.answer).toContain("Aurythia");
    });
  });
});
