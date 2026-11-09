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

export const SqlTableCheckProbeSchema = z
  .object({
    type: z.literal("sql_table_check"),
    table: z.string().min(1),
    primaryKey: z.array(z.string()).optional(),
    foreignKeys: z
      .array(
        z
          .object({
            column: z.string().min(1),
            refTable: z.string().min(1),
            refColumn: z.string().optional(),
          })
          .strict(),
      )
      .optional(),
    columns: z
      .array(
        z
          .object({
            name: z.string().min(1),
            baseType: z.string().optional(),
            notNull: z.boolean().optional(),
            hasCheck: z.boolean().optional(),
            hasDefault: z.boolean().optional(),
            unique: z.boolean().optional(),
          })
          .strict(),
      )
      .optional(),
    hasCheck: z.boolean().optional(),
    checkMinRows: z.number().int().min(0).optional(),
  })
  .strict();

export const SqlQueryResultProbeSchema = z
  .object({
    type: z.literal("sql_query_result"),
    query: z.string().min(1),
    expectedRowCount: z.number().int().optional(),
    minRowCount: z.number().int().optional(),
    expectedValues: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const PhpMySqliCheckProbeSchema = z
  .object({
    type: z.literal("php_mysqli_check"),
    entrypoint: z.string().min(1).optional(),
    postData: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    expectedStdoutContains: z.string().optional(),
    expectedStdoutPattern: z.string().optional(),
    expectedTableRows: z
      .object({
        table: z.string().min(1),
        minCount: z.number().int().optional(),
        where: z.record(z.string(), z.unknown()).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const ProbeSchema = z.discriminatedUnion("type", [
  DomProbeSchema,
  CssProbeSchema,
  JsProbeSchema,
  SqlTableCheckProbeSchema,
  SqlQueryResultProbeSchema,
  PhpMySqliCheckProbeSchema,
]);

/**
 * Cas de test pour les vérifications de fonctions JS déclarées (ex: ex-js-01, examens)
 */
export const JsTestCaseSchema = z
  .object({
    input_cin: z.string().optional(),
    expected_return: z.boolean().optional(),
    saisies: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
    attendu: z.boolean().optional(),
    appel: z.string().optional(),
    etat: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
    texte: z.record(z.string(), z.string()).optional(),
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
    controle_positif: z.record(z.string(), z.string()).optional(),
    cas: z.array(JsTestCaseSchema).optional(),
    js_function: z.string().optional(),

    // Vérifications déclarées HTML / Form / Attributs
    expected_attributes: z.record(z.string(), z.string()).optional(),

    // Vérifications déclarées SQL / PHP (patterns LDD/LMD/MySQLi)
    sql_pattern: z.string().optional(),
    php_pattern: z.string().optional(),

    // Indices progressifs à 3 niveaux (Issue #133 / PED-06)
    indices: z.array(z.string().min(1)).max(3).optional(),
    hints: z.array(z.string().min(1)).max(3).optional(),
  })
  .strict()
  .refine((data) => !!(data.titre || data.label || data.description), {
    message: "Un critère doit comporter au moins un 'titre', 'label' ou 'description'",
  });

export const CriteriaListSchema = z.array(CriterionJsonSchema);

export type ValidatedCriterionJson = z.infer<typeof CriterionJsonSchema>;
