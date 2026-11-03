import { z } from "zod";

/**
 * Schémas des sondes supportées dans `criteria.json`
 */
export const DomProbeSchema = z
  .object({
    type: z.literal("dom_selector"),
    selector: z.string().min(1),
    minCount: z.number().int().positive().optional(),
    textNotEmpty: z.boolean().optional(),
    containsText: z.string().optional(),
    hasAttribute: z.string().optional(),
    attributeStartsWith: z
      .object({
        name: z.string().min(1),
        prefix: z.string(),
      })
      .strict()
      .optional(),
    containsClass: z.string().optional(),
  })
  .strict();

export const CssProbeSchema = z
  .object({
    type: z.literal("css_property"),
    selector: z.string().min(1),
    property: z.string().min(1),
    expectedValue: z.string().optional(),
    isGreaterThanZero: z.boolean().optional(),
  })
  .strict();

export const JsProbeSchema = z
  .object({
    type: z.literal("js_eval"),
    actions: z
      .array(
        z
          .object({
            type: z.literal("click"),
            selector: z.string().min(1),
            repeat: z.number().int().positive().optional(),
          })
          .strict(),
      )
      .optional(),
    checkSelector: z.string().min(1),
    checkText: z.string().optional(),
    checkClass: z.string().optional(),
  })
  .strict();

export const ProbeSchema = z.discriminatedUnion("type", [
  DomProbeSchema,
  CssProbeSchema,
  JsProbeSchema,
]);

/**
 * Cas de test pour les vérifications de fonctions JS déclarées (ex: ex-js-01, examens)
 */
export const JsTestCaseSchema = z
  .object({
    input_cin: z.string().optional(),
    expected_return: z.boolean().optional(),
    saisies: z.record(z.union([z.string(), z.boolean(), z.number()])).optional(),
    attendu: z.boolean().optional(),
    appel: z.string().optional(),
    etat: z.record(z.union([z.string(), z.boolean(), z.number()])).optional(),
    texte: z.record(z.string()).optional(),
  })
  .strict();

/**
 * Schéma strict d'un critère d'évaluation (CriterionJsonSchema)
 * Rejette strictement tout champ non reconnu (.strict())
 */
export const CriterionJsonSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().optional(),
    titre: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    points: z.number().min(0),
    ordre: z.number().optional(),
    fail_message: z.string().optional(),
    fail: z.string().optional(),
    fichier: z.string().optional(),
    correction: z.enum(["enseignant", "automatique"]).optional(),

    // Sonde formelle (DOM / CSS / JS eval)
    sonde: ProbeSchema.optional(),

    // Vérifications déclarées CSS (ex: ex-html-css-01, tp-fs-01)
    selector: z.string().optional(),
    css_property: z.string().optional(),
    expected_value: z.string().optional(),
    css_rule_contains: z.string().optional(),

    // Vérifications déclarées JS (ex: ex-js-01, examens, tp-fs)
    type: z.string().optional(),
    function_name: z.string().optional(),
    input_cin: z.string().optional(),
    expected_return: z.boolean().optional(),
    controle_positif: z.record(z.string()).optional(),
    cas: z.array(JsTestCaseSchema).optional(),
    js_function: z.string().optional(),

    // Vérifications déclarées HTML / Form / Attributs
    expected_attributes: z.record(z.string()).optional(),

    // Vérifications déclarées SQL / PHP (patterns LDD/LMD/MySQLi)
    sql_pattern: z.string().optional(),
    php_pattern: z.string().optional(),
  })
  .strict()
  .refine((data) => !!(data.titre || data.label || data.description), {
    message: "Un critère doit comporter au moins un 'titre', 'label' ou 'description'",
  });

export const CriteriaListSchema = z.array(CriterionJsonSchema);

export type ValidatedCriterionJson = z.infer<typeof CriterionJsonSchema>;
