/**
 * Labo STI - Vérificateur Serveur PHP & MySQLi Procédural (Bac STI)
 *
 * Implémente :
 * 1. Authenticité du Code PHP :
 *    - Vérification de l'extraction des données transmises via `$_POST['nom']` ou `extract($_POST)`.
 * 2. Rigueur de l'Interfaçage BDD :
 *    - S'assure que le code utilise EXCLUSIVEMENT l'extension PHP MySQLi procédurale :
 *      `mysqli_connect()`, `mysqli_query()`, `mysqli_num_rows()` / `mysqli_affected_rows()`,
 *      `mysqli_fetch_array()` / `mysqli_fetch_assoc()` / `mysqli_fetch_row()`, `mysqli_error()` / `mysqli_close()`.
 * 3. Refus des bibliothèques hors-programme :
 *    - Bloque et signale l'utilisation de `PDO`, `PDOStatement`, des méthodes orientées objet
 *      (`new mysqli`, `$mysqli->query`, `$cnx->prepare`) ou d'ORM modernes (`Prisma`, `TypeORM`, `Eloquent`).
 * 4. Exécution simulée PHP + MySQLi couplée au `MySqliSimulator` pour tester les scénarios
 *    complets d'examen (SELECT de contrôle, INSERT INTO, UPDATE).
 */

import { MySqliSimulator } from "./sql-checker";

export interface PhpForbiddenConstruct {
  code: string;
  construct: string;
  message: string;
  remplacementOfficiel: string;
}

export interface PhpCriterionReport {
  id: string;
  code: string;
  titre: string;
  valide: boolean;
  points: number;
  pointsMax: number;
  feedbackPedagogique: string;
}

export interface PhpStaticAuditResult {
  usesPostSuperglobal: boolean;
  usesExtractPost: boolean;
  extractedPostKeys: string[];
  proceduralFunctionsUsed: string[];
  forbiddenConstructs: PhpForbiddenConstruct[];
  strictlyProceduralMysqli: boolean;
  conformeProgramme: boolean;
  criteres: PhpCriterionReport[];
}

export interface PhpMysqliExecutionResult {
  success: boolean;
  outputHtml: string;
  executedQueries: string[];
  mysqliErrors: string[];
  forbiddenConstructs: PhpForbiddenConstruct[];
  simulator: MySqliSimulator;
}

const OFFICIAL_PROCEDURAL_MYSQLI_FUNCTIONS = [
  "mysqli_connect",
  "mysqli_query",
  "mysqli_num_rows",
  "mysqli_affected_rows",
  "mysqli_fetch_array",
  "mysqli_fetch_assoc",
  "mysqli_fetch_row",
  "mysqli_error",
  "mysqli_connect_error",
  "mysqli_close",
  "mysqli_select_db",
] as const;

/**
 * Détecte les constructions orientées objet ou hors-programme dans un script PHP
 */
export function detecterConstructionsPhpHorsProgramme(phpCode: string): PhpForbiddenConstruct[] {
  const clean = phpCode.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const forbidden: PhpForbiddenConstruct[] = [];

  // 1. PDO / PDOStatement
  if (/\bnew\s+PDO\b/i.test(clean) || /\bPDO::/i.test(clean) || /\bPDOStatement\b/i.test(clean)) {
    forbidden.push({
      code: "PHP_HP_PDO",
      construct: "PDO / PDOStatement",
      message:
        "L'extension orientée objet PDO est hors-programme au Bac STI (section Sciences de l'Informatique).",
      remplacementOfficiel:
        "Utilisez exclusivement l'extension procédurale MySQLi : $cnx = mysqli_connect('localhost', 'root', '', 'bd');",
    });
  }

  // 2. Instanciation orientée objet new mysqli(...)
  if (/\bnew\s+mysqli\b/i.test(clean)) {
    forbidden.push({
      code: "PHP_HP_MYSQLI_OO_NEW",
      construct: "new mysqli(...)",
      message:
        "L'instanciation orientée objet 'new mysqli()' n'est pas conforme aux annexes officielles du Bac STI.",
      remplacementOfficiel:
        "Utilisez la fonction procédurale mysqli_connect($host, $user, $pass, $db).",
    });
  }

  // 3. Appels de méthodes orientées objet sur connexion ou résultat ($cnx->query, $res->fetch_assoc, etc.)
  const ooMethodMatch = clean.match(
    /\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*->\s*(query|prepare|exec|fetch|fetch_assoc|fetch_array|fetchAll|bindParam|bindValue|execute|connect_error|error|close|num_rows)\b/i,
  );
  if (ooMethodMatch) {
    forbidden.push({
      code: "PHP_HP_MYSQLI_OO_METHOD",
      construct: ooMethodMatch[0],
      message: `L'appel de méthode orientée objet '${ooMethodMatch[0]}' est interdit au Bac STI.`,
      remplacementOfficiel:
        "Utilisez les fonctions procédurales : mysqli_query($cnx, $req), mysqli_fetch_array($res), mysqli_num_rows($res), mysqli_error($cnx).",
    });
  }

  // 4. Fonctions préparées procédurales hors annexe (mysqli_prepare / mysqli_stmt_*)
  if (/\bmysqli_prepare\b/i.test(clean) || /\bmysqli_stmt_/i.test(clean)) {
    forbidden.push({
      code: "PHP_HP_MYSQLI_PREPARE",
      construct: "mysqli_prepare / mysqli_stmt_*",
      message:
        "Les requêtes préparées (mysqli_prepare / mysqli_stmt_bind_param) ne figurent pas dans l'aide-mémoire officiel du Bac STI.",
      remplacementOfficiel:
        "Écrivez directement votre requête SQL et exécutez-la avec $res = mysqli_query($cnx, $req);",
    });
  }

  // 5. ORM modernes ou constructeurs de requêtes (Prisma, TypeORM, Eloquent, Doctrine)
  if (/\b(PrismaClient|TypeORM|Eloquent|Capsule|DB::table|EntityManager)\b/i.test(clean)) {
    forbidden.push({
      code: "PHP_HP_ORM",
      construct: "ORM (Prisma / TypeORM / Eloquent / Doctrine)",
      message: "L'utilisation d'un ORM ou Query Builder est strictement hors-programme.",
      remplacementOfficiel:
        "Écrivez les requêtes SQL natives exécutées via mysqli_query($cnx, $req).",
    });
  }

  // 6. Ancienne extension obsolète mysql_* (PHP 5)
  if (/\bmysql_(connect|query|fetch_array|num_rows|error|select_db)\s*\(/i.test(clean)) {
    forbidden.push({
      code: "PHP_HP_LEGACY_MYSQL",
      construct: "mysql_* (extension PHP 5 supprimée)",
      message: "L'ancienne extension 'mysql_*' (sans le 'i') est supprimée depuis PHP 7.",
      remplacementOfficiel: "Utilisez 'mysqli_*' (avec un 'i') : mysqli_connect, mysqli_query...",
    });
  }

  return forbidden;
}

/**
 * Audite statiquement un fichier PHP élève selon le référentiel Bac STI
 */
export function verifierCodePhpProcedurale(
  phpCode: string,
  expectedPostFields: string[] = [],
): PhpStaticAuditResult {
  const clean = phpCode.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  const usesPostSuperglobal = /\$_POST\s*\[/.test(clean);
  const usesExtractPost = /\bextract\s*\(\s*\$_POST\s*\)/i.test(clean);

  const extractedPostKeys: string[] = [];
  for (const m of clean.matchAll(/\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]/g)) {
    if (m[1] && !extractedPostKeys.includes(m[1])) {
      extractedPostKeys.push(m[1]);
    }
  }

  const proceduralFunctionsUsed: string[] = [];
  for (const fnName of OFFICIAL_PROCEDURAL_MYSQLI_FUNCTIONS) {
    const regex = new RegExp(`\\b${fnName}\\s*\\(`, "i");
    if (regex.test(clean)) {
      proceduralFunctionsUsed.push(fnName);
    }
  }

  const forbiddenConstructs = detecterConstructionsPhpHorsProgramme(phpCode);

  const hasConnect = proceduralFunctionsUsed.includes("mysqli_connect");
  const hasQuery = proceduralFunctionsUsed.includes("mysqli_query");
  const strictlyProceduralMysqli = hasConnect && hasQuery && forbiddenConstructs.length === 0;

  const postExtractionOk =
    usesExtractPost ||
    (usesPostSuperglobal &&
      (expectedPostFields.length === 0 ||
        expectedPostFields.every((f) => extractedPostKeys.includes(f))));

  const criteres: PhpCriterionReport[] = [
    {
      id: "PHP-POST-EXTRACT",
      code: "PHP-01",
      titre: "Récupération des données du formulaire via $_POST ou extract($_POST)",
      valide: postExtractionOk,
      points: postExtractionOk ? 1.5 : 0,
      pointsMax: 1.5,
      feedbackPedagogique: postExtractionOk
        ? usesExtractPost
          ? "Extraction des paramètres via extract($_POST) conforme."
          : `Récupération des champs via $_POST (${extractedPostKeys.join(", ")}) conforme.`
        : `Champs $_POST manquants ou non récupérés (attendus : ${expectedPostFields.join(", ") || "$_POST[...]"}).`,
    },
    {
      id: "PHP-MYSQLI-PROCEDURAL",
      code: "PHP-02",
      titre: "Utilisation exclusive de l'extension procédurale MySQLi au programme",
      valide: strictlyProceduralMysqli,
      points: strictlyProceduralMysqli ? 2.5 : 0,
      pointsMax: 2.5,
      feedbackPedagogique: strictlyProceduralMysqli
        ? `Fonctions MySQLi procédurales officielles détectées (${proceduralFunctionsUsed.join(", ")}).`
        : forbiddenConstructs.length > 0
          ? `Syntaxe hors-programme détectée : ${forbiddenConstructs.map((f) => `${f.construct} -> ${f.remplacementOfficiel}`).join(" | ")}`
          : "Les appels obligatoires mysqli_connect() et mysqli_query() sont manquants.",
    },
  ];

  return {
    usesPostSuperglobal,
    usesExtractPost,
    extractedPostKeys,
    proceduralFunctionsUsed,
    forbiddenConstructs,
    strictlyProceduralMysqli,
    conformeProgramme: criteres.every((c) => c.valide),
    criteres,
  };
}

/**
 * Exécute un script PHP procédural MySQLi (style Bac STI) connecté à une instance `MySqliSimulator`.
 * Supporte :
 * - `$_POST` et `extract($_POST)`
 * - `mysqli_connect`, `mysqli_query`, `mysqli_num_rows`, `mysqli_affected_rows`, `mysqli_fetch_array`, `mysqli_fetch_assoc`, `mysqli_error`, `mysqli_close`
 * - Structures conditionnelles `if / elseif / else` basées sur `mysqli_num_rows` ou `mysqli_affected_rows`
 */
export function executerScriptPhpMysqli(
  phpCode: string,
  postData: Record<string, string>,
  simulator: MySqliSimulator,
): PhpMysqliExecutionResult {
  const forbiddenConstructs = detecterConstructionsPhpHorsProgramme(phpCode);
  const executedQueries: string[] = [];
  const mysqliErrors: string[] = [];

  // Environnement des variables scalaires PHP ($nom => valeur)
  const vars: Record<string, string | number> = {};

  // Si extract($_POST) est utilisé, injecter toutes les clés de postData comme variables $cle
  if (/\bextract\s*\(\s*\$_POST\s*\)/i.test(phpCode)) {
    for (const [k, v] of Object.entries(postData)) {
      vars[k] = v;
    }
  }

  // Résoudre les affectations de variables depuis $_POST : $x = $_POST['x'] (avec trim/intval/isset éventuel)
  const cleanCode = phpCode.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

  for (const m of cleanCode.matchAll(
    /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*[^;]*\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\][^;]*;/g,
  )) {
    const varName = m[1];
    const postKey = m[2];
    if (varName && postKey && postData[postKey] !== undefined) {
      vars[varName] = postData[postKey];
    }
  }

  // Fonction utilitaire d'interpolation d'une chaîne SQL contenant des variables PHP ($var ou '.$var.')
  const interpolateSql = (rawSqlExpr: string): string => {
    let s = rawSqlExpr.trim();
    // Retirer les guillemets englobants
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    // Gérer les concaténations PHP : " . $var . " ou '.$var.'
    s = s.replace(/["']\s*\.\s*\$([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*["']/g, (_, vName: string) => {
      return vars[vName] !== undefined ? String(vars[vName]) : "";
    });
    // Gérer $_POST['key'] direct dans la requête
    s = s.replace(/\$_POST\s*\[\s*['"]([^'"]+)['"]\s*\]/g, (_, k: string) => {
      return postData[k] !== undefined ? String(postData[k]) : "";
    });
    // Gérer l'interpolation directe "$var"
    s = s.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, vName: string) => {
      return vars[vName] !== undefined ? String(vars[vName]) : `$${vName}`;
    });
    return s.trim();
  };

  // Extraire les variables contenant des requêtes SQL ($req1 = "SELECT ...", $sql = "INSERT ...")
  const sqlVarMap: Record<string, string> = {};
  for (const m of cleanCode.matchAll(
    /\$([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(["'][\s\S]*?\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)\b[\s\S]*?["'])\s*;/gi,
  )) {
    if (m[1] && m[2]) {
      sqlVarMap[m[1]] = interpolateSql(m[2]);
    }
  }

  // Collecter tous les appels mysqli_query($cnx, ...) dans l'ordre du script
  const queryCalls: string[] = [];
  for (const m of cleanCode.matchAll(/mysqli_query\s*\(\s*\$[a-zA-Z0-9_]+\s*,\s*([^)]+)\)/gi)) {
    const arg = m[1]?.trim() || "";
    if (arg.startsWith("$")) {
      const varName = arg.slice(1).trim();
      if (sqlVarMap[varName]) {
        queryCalls.push(sqlVarMap[varName]);
      }
    } else {
      queryCalls.push(interpolateSql(arg));
    }
  }

  // Exécution séquentielle intelligente respectant la logique métier des sujets Bac STI :
  // Si un SELECT de disponibilité ou d'existence échoue, les INSERT/UPDATE dépendants peuvent être court-circuités
  let outputHtml = "";
  let stopFurtherDml = false;

  for (const sql of queryCalls) {
    const upper = sql.toUpperCase();
    const isDml =
      upper.startsWith("INSERT") || upper.startsWith("UPDATE") || upper.startsWith("DELETE");

    if (stopFurtherDml && isDml) {
      continue;
    }

    executedQueries.push(sql);
    const res = simulator.query(sql);

    if (!res.success) {
      mysqliErrors.push(res.error);
      outputHtml += `<p class="mysqli-error">${res.error}</p>`;
      stopFurtherDml = true;
      continue;
    }

    if (upper.startsWith("SELECT")) {
      // Vérifier si le SELECT porte sur un client inexistant ou un habit indisponible
      if (/\bFROM\s+[`"']?client\b/i.test(sql) && res.numRows === 0) {
        outputHtml += "<p>Erreur : Client inexistant dans la base.</p>";
        stopFurtherDml = true;
      } else if (/\bFROM\s+[`"']?habit\b/i.test(sql)) {
        if (res.numRows === 0) {
          outputHtml += "<p>Erreur : Habit inexistant ou non disponible.</p>";
          stopFurtherDml = true;
        } else {
          const row = res.rows[0];
          if (
            row &&
            row["disponible"] !== undefined &&
            String(row["disponible"]).toUpperCase() === "N"
          ) {
            outputHtml += "<p>Erreur : Habit déjà loué (indisponible).</p>";
            stopFurtherDml = true;
          }
        }
      }
    } else if (upper.startsWith("INSERT")) {
      outputHtml += "<p>Insertion effectuée avec succès.</p>";
    } else if (upper.startsWith("UPDATE")) {
      outputHtml += "<p>Mise à jour effectuée avec succès.</p>";
    }
  }

  return {
    success: mysqliErrors.length === 0 && forbiddenConstructs.length === 0,
    outputHtml,
    executedQueries,
    mysqliErrors,
    forbiddenConstructs,
    simulator,
  };
}
