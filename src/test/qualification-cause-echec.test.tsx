/**
 * Tests de qualification des causes d'échec et durcissement de css_property (PED-05 / Issue #130)
 */

import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { makeProbeCheck, critereDepuisJson } from "@/lib/evaluation/critere-json";
import { runCriteria, type Criterion } from "@/lib/exercises";
import {
  evaluerSqlTableCheck,
  evaluerSqlQueryResult,
  evaluerPhpMySqliCheck,
} from "@/lib/evaluation/sql-php-evaluator";

describe("Durcissement de la sonde css_property (PED-05 / Issue #130)", () => {
  function creerDocumentCss(html: string, styleElement: string) {
    const dom = new JSDOM(html);
    const win = dom.window as unknown as Window;
    const computed = {
      getComputedStyle: (el: Element) => ({
        getPropertyValue: (prop: string) => {
          if (el.id === "target") return styleElement;
          return "";
        },
      }),
    };
    const proxiedWin = Object.assign(Object.create(win), {
      getComputedStyle: computed.getComputedStyle,
    });
    return { doc: dom.window.document, win: proxiedWin as Window };
  }

  it("ne valide PAS '0px' par défaut sans expectedValue", () => {
    const { doc, win } = creerDocumentCss(`<div id="target"></div>`, "0px");
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "border-radius",
    };
    expect(makeProbeCheck(probe)(doc, win)).toBe(false);
  });

  it("ne valide PAS 'none' par défaut", () => {
    const { doc, win } = creerDocumentCss(`<div id="target"></div>`, "none");
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "border-style",
    };
    expect(makeProbeCheck(probe)(doc, win)).toBe(false);
  });

  it("ne valide PAS '0', '0rem', 'transparent' ou 'unset'", () => {
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "border-width",
    };
    for (const val of ["0", "0rem", "0em", "0%", "transparent", "initial", "inherit", "unset"]) {
      const { doc, win } = creerDocumentCss(`<div id="target"></div>`, val);
      expect(makeProbeCheck(probe)(doc, win)).toBe(false);
    }
  });

  it("valide une valeur non nulle par défaut quand une propriété réelle est présente", () => {
    const { doc, win } = creerDocumentCss(`<div id="target"></div>`, "8px");
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "border-radius",
    };
    expect(makeProbeCheck(probe)(doc, win)).toBe(true);
  });

  it("refuse une sous-chaîne comme '1' dans '10px' pour expectedValue", () => {
    const { doc, win } = creerDocumentCss(`<div id="target"></div>`, "10px");
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "font-size",
      expectedValue: "1",
    };
    expect(makeProbeCheck(probe)(doc, win)).toBe(false);
  });

  it("accepte la valeur exacte ou un mot-clé délimité", () => {
    const { doc, win } = creerDocumentCss(`<div id="target"></div>`, "10px solid #000");
    const probe = {
      type: "css_property",
      selector: "#target",
      property: "border",
      expectedValue: "10px",
    };
    expect(makeProbeCheck(probe)(doc, win)).toBe(true);
  });
});

describe("Qualification des causes d'échec des critères (PED-05 / Issue #130)", () => {
  it("qualifie 'absent' quand le sélecteur DOM est introuvable", () => {
    const dom = new JSDOM(`<body><h1>Bonjour</h1></body>`);
    const crit = critereDepuisJson({
      id: "c_form",
      titre: "Formulaire présent",
      points: 2,
      sonde: {
        type: "dom_selector",
        selector: "form#monForm",
      },
      fail_message: "Le formulaire #monForm est absent",
    });

    const results = runCriteria([crit], dom.window.document, dom.window as unknown as Window);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.cause).toBe("absent");
  });

  it("qualifie 'absent' quand la fonction JavaScript attendue est manquante", () => {
    const dom = new JSDOM(`<body><input id="cin" value="12345678"></body>`, {
      runScripts: "dangerously",
    });
    const crit = critereDepuisJson({
      id: "c_verif",
      titre: "Fonction de vérification",
      points: 2,
      sonde: {
        type: "js_test_cas",
        function_name: "verif",
        cas: [{ saisies: { cin: "12345678" }, attendu: true }],
      },
      fail_message: "La fonction verif est absente",
    });

    const results = runCriteria([crit], dom.window.document, dom.window as unknown as Window);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.cause).toBe("absent");
  });

  it("qualifie 'execution' quand la fonction JavaScript lève une exception", () => {
    const dom = new JSDOM(
      `<body>
        <input id="cin" value="12345678">
        <script>function verif() { throw new TypeError('Crash volontaire'); }</script>
      </body>`,
      { runScripts: "dangerously" },
    );
    const crit = critereDepuisJson({
      id: "c_verif",
      titre: "Fonction de vérification",
      points: 2,
      sonde: {
        type: "js_test_cas",
        function_name: "verif",
        cas: [{ saisies: { cin: "12345678" }, attendu: true }],
      },
      fail_message: "La fonction verif doit accepter",
    });

    const results = runCriteria([crit], dom.window.document, dom.window as unknown as Window);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.cause).toBe("execution");
  });

  it("qualifie 'syntaxe' quand un script présent dans le document a une erreur de syntaxe", () => {
    const dom = new JSDOM(
      `<body>
        <script>function verif() { return </script>
      </body>`,
    );
    const crit = critereDepuisJson({
      id: "c_verif",
      titre: "Fonction de vérification",
      points: 2,
      sonde: {
        type: "js_test_cas",
        function_name: "verif",
        cas: [{ saisies: { cin: "12345678" }, attendu: true }],
      },
      fail_message: "La fonction verif doit être définie",
    });

    const results = runCriteria([crit], dom.window.document, dom.window as unknown as Window);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.cause).toBe("syntaxe");
  });

  it("qualifie 'valeur' quand la fonction s'exécute sans erreur mais renvoie une mauvaise valeur", () => {
    const dom = new JSDOM(
      `<body>
        <input id="cin" value="12345678">
        <script>function verif() { return false; }</script>
      </body>`,
      { runScripts: "dangerously" },
    );
    const crit = critereDepuisJson({
      id: "c_verif",
      titre: "Fonction de vérification",
      points: 2,
      sonde: {
        type: "js_test_cas",
        function_name: "verif",
        cas: [{ saisies: { cin: "12345678" }, attendu: true }],
      },
      fail_message: "La fonction verif doit accepter 8 chiffres",
    });

    const results = runCriteria([crit], dom.window.document, dom.window as unknown as Window);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.cause).toBe("valeur");
  });

  it("qualifie 'absent' et 'valeur' dans les critères SQL réels", () => {
    const critTable = {
      id: "sql_table",
      label: "Table client",
      points: 2,
      fail: "Table introuvable",
      raw: {
        sonde: {
          type: "sql_table_check",
          table: "client_inexistant",
        },
      },
      check: () => false,
    } as unknown as Criterion;

    const res1 = evaluerSqlTableCheck(
      critTable,
      { type: "sql_table_check", table: "client_inexistant" },
      {
        "init.sql": "CREATE TABLE utilisateur (id INT PRIMARY KEY);",
      },
    );
    expect(res1.ok).toBe(false);
    expect(res1.cause).toBe("absent");

    const critQuery = {
      id: "sql_query",
      label: "Requête SELECT",
      points: 2,
      fail: "Nombre de lignes incorrect",
      raw: {
        sonde: {
          type: "sql_query_result",
          query: "SELECT * FROM utilisateur",
          expectedRowCount: 5,
        },
      },
      check: () => false,
    } as unknown as Criterion;

    const res2 = evaluerSqlQueryResult(
      critQuery,
      {
        type: "sql_query_result",
        query: "SELECT * FROM utilisateur",
        expectedRowCount: 5,
      },
      {
        "init.sql": "CREATE TABLE utilisateur (id INT PRIMARY KEY);",
      },
    );
    expect(res2.ok).toBe(false);
    expect(res2.cause).toBe("valeur");
  });

  it("qualifie 'syntaxe' lors d'une erreur de requête SQL", () => {
    const critQuery = {
      id: "sql_query_err",
      label: "Requête SELECT syntaxe",
      points: 2,
      fail: "Erreur SQL",
      raw: {
        sonde: {
          type: "sql_query_result",
          query: "SELECT FROM WHERE",
        },
      },
      check: () => false,
    } as unknown as Criterion;

    const res = evaluerSqlQueryResult(
      critQuery,
      {
        type: "sql_query_result",
        query: "SELECT FROM WHERE",
      },
      {
        "init.sql": "CREATE TABLE t (id INT);",
      },
    );
    expect(res.ok).toBe(false);
    expect(res.cause).toBe("syntaxe");
  });

  it("qualifie 'absent' quand le script PHP est manquant", () => {
    const critPhp = {
      id: "php_script",
      label: "Script PHP",
      points: 2,
      fail: "Fichier absent",
      raw: {
        sonde: {
          type: "php_mysqli_check",
          entrypoint: "manquant.php",
        },
      },
      check: () => false,
    } as unknown as Criterion;

    const res = evaluerPhpMySqliCheck(
      critPhp,
      {
        type: "php_mysqli_check",
        entrypoint: "manquant.php",
      },
      {},
    );
    expect(res.ok).toBe(false);
    expect(res.cause).toBe("absent");
  });
});

import { render, screen } from "@testing-library/react";
import React from "react";
import { EvaluationResultsPane } from "@/components/workspace/EvaluationResultsPane";
import type { EvaluationSummary } from "@/lib/evaluation/probe-runner";

describe("Affichage des badges de cause d'échec dans EvaluationResultsPane (Issue #130)", () => {
  it("affiche les badges explicites pour absent, syntaxe, execution et valeur", () => {
    const summary: EvaluationSummary = {
      results: [
        {
          id: "c1",
          code: "C1",
          label: "Critère absent",
          points: 0,
          maxPoints: 2,
          passed: false,
          message: "Élément introuvable",
          durationMs: 10,
          automatique: true,
          cause: "absent",
        },
        {
          id: "c2",
          code: "C2",
          label: "Critère syntaxe",
          points: 0,
          maxPoints: 2,
          passed: false,
          message: "Erreur syntaxe",
          durationMs: 10,
          automatique: true,
          cause: "syntaxe",
        },
        {
          id: "c3",
          code: "C3",
          label: "Critère exécution",
          points: 0,
          maxPoints: 2,
          passed: false,
          message: "Crash JS",
          durationMs: 10,
          automatique: true,
          cause: "execution",
        },
        {
          id: "c4",
          code: "C4",
          label: "Critère valeur",
          points: 0,
          maxPoints: 2,
          passed: false,
          message: "Valeur erronée",
          durationMs: 10,
          automatique: true,
          cause: "valeur",
        },
      ],
      earnedPoints: 0,
      totalPoints: 8,
      note20: 0,
      totalDurationMs: 40,
      evaluatedAt: Date.now(),
    };

    render(<EvaluationResultsPane summary={summary} onVerify={() => {}} />);

    expect(screen.getByText("Élément absent")).toBeDefined();
    expect(screen.getByText("Erreur de syntaxe")).toBeDefined();
    expect(screen.getByText("Erreur d'exécution JS")).toBeDefined();
    expect(screen.getByText("Valeur incorrecte")).toBeDefined();
  });
});
