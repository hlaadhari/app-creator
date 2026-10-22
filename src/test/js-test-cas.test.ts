import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

import { construireVerificationDeclaree } from "@/lib/evaluation/declared-criteria";

const executer = (dom: JSDOM, code: string) =>
  (dom.window as unknown as { eval: (c: string) => unknown }).eval(code);

const PAGE = `<form>
  <input id="code" type="text" />
  <input id="a" type="checkbox" />
  <input id="b" type="checkbox" />
  <input id="debut" type="date" />
  <select id="choix"><option value="">-</option><option value="x">X</option></select>
  <output id="total">0</output>
</form>`;

function evaluer(script: string, critere: Record<string, unknown>): boolean | null {
  const dom = new JSDOM(`<body>${PAGE}</body>`, { runScripts: "outside-only" });
  executer(dom, script);
  const verif = construireVerificationDeclaree(critere);
  return verif ? verif(dom.window.document, dom.window as never) : null;
}

const critere = {
  type: "js_test_cas",
  function_name: "verif",
  cas: [
    { saisies: { code: "AB1" }, attendu: true },
    { saisies: { code: "zzz" }, attendu: false },
    { saisies: { code: "" }, attendu: false },
  ],
};

const BON = `function verif(){ return /^[A-Z]{2}\\d$/.test(document.getElementById("code").value); }`;

describe("Vérification par cas js_test_cas", () => {
  it("valide une fonction correcte et refuse une fonction qui accepte ou refuse tout", () => {
    expect(evaluer(BON, critere)).toBe(true);
    expect(evaluer("function verif(){ return true; }", critere)).toBe(false);
    expect(evaluer("function verif(){ return false; }", critere)).toBe(false);
  });

  it("refuse une fonction absente ou qui plante", () => {
    expect(evaluer("", critere)).toBe(false);
    expect(evaluer("function verif(){ throw new Error('x'); }", critere)).toBe(false);
  });

  it("n'est pas vérifiable quand tous les cas attendent « false » (le code de départ passerait)", () => {
    const seulementFaux = { ...critere, cas: [{ saisies: { code: "zzz" }, attendu: false }] };
    expect(construireVerificationDeclaree(seulementFaux)).toBeNull();
  });

  it("n'est pas vérifiable sans cas, sans attente ou sans fonction", () => {
    expect(construireVerificationDeclaree({ type: "js_test_cas", function_name: "verif" })).toBeNull();
    expect(
      construireVerificationDeclaree({ ...critere, cas: [{ saisies: { code: "AB1" } }] }),
    ).toBeNull();
    expect(
      construireVerificationDeclaree({ type: "js_test_cas", cas: [{ saisies: {}, attendu: true }] }),
    ).toBeNull();
  });

  it("contrôle l'état des cases après l'appel d'une fonction (« etat »)", () => {
    const c = {
      type: "js_test_cas",
      cas: [
        { saisies: { a: true, b: false }, appel: "lie", etat: { b: true } },
        { saisies: { a: false, b: false }, appel: "lie", etat: { b: false } },
      ],
    };
    const lie = `function lie(){ if (document.getElementById("a").checked) document.getElementById("b").checked = true; }`;
    expect(evaluer(lie, c)).toBe(true);
    expect(evaluer("function lie(){}", c)).toBe(false);
    expect(
      evaluer(`function lie(){ document.getElementById("b").checked = true; }`, c),
    ).toBe(false);
  });

  it("contrôle un texte affiché (« texte ») et la valeur d'une liste", () => {
    const c = {
      type: "js_test_cas",
      cas: [{ saisies: { code: "7", choix: "x" }, appel: "maj", texte: { total: "7/x" } }],
    };
    const maj = `function maj(){ document.getElementById("total").textContent = document.getElementById("code").value + "/" + document.getElementById("choix").value; }`;
    expect(evaluer(maj, c)).toBe(true);
    expect(evaluer("function maj(){}", c)).toBe(false);
  });

  it("résout les dates relatives (+Nj / -Nj) par rapport à aujourd'hui", () => {
    const c = {
      type: "js_test_cas",
      function_name: "futur",
      cas: [
        { saisies: { debut: "+10j" }, attendu: true },
        { saisies: { debut: "-1j" }, attendu: false },
        { saisies: { debut: "+0j" }, attendu: false },
      ],
    };
    const futur = `function futur(){ var d = document.getElementById("debut").value; return d > new Date().toLocaleDateString("sv-SE"); }`;
    expect(evaluer(futur, c)).toBe(true);
  });

  it("un champ inconnu fait échouer le cas : jamais de validation silencieuse", () => {
    const c = { ...critere, cas: [{ saisies: { inexistant: "x" }, attendu: true }] };
    expect(evaluer(BON, c)).toBe(false);
  });

  it("restaure les champs après chaque cas", () => {
    const dom = new JSDOM(`<body>${PAGE}</body>`, { runScripts: "outside-only" });
    executer(dom, BON);
    (dom.window.document.getElementById("code") as HTMLInputElement).value = "avant";
    const verif = construireVerificationDeclaree(critere)!;
    verif(dom.window.document, dom.window as never);
    expect((dom.window.document.getElementById("code") as HTMLInputElement).value).toBe("avant");
  });
});
