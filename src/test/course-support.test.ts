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
});
