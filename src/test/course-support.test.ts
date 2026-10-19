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
});
