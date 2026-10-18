/**
 * Tests d'intégration et unitaires du moteur d'exécution PHP 8.2 WASM dans un Web Worker isolé (Issue #13, PRD F-22 à F-24, T-10, §8.1)
 */

import { describe, expect, it } from "vitest";
import {
  extraireQueryParams,
  genererPreludePhp,
  genererTrailerPhp,
  preparerSuperglobales,
} from "../lib/php/superglobals";
import {
  detecterBoucleInfinieStatique,
  executerScriptPhpCore,
  MAX_EXECUTION_TIME_MS,
  MAX_MEMORY_LIMIT_BYTES,
  MAX_STDOUT_BYTES,
  SUPPORTED_PHP_EXTENSIONS,
} from "../lib/php/php-worker-core";
import { PhpRunner } from "../lib/php/php-runner";

describe("feat(php): Moteur d'exécution PHP 8.2 WASM et Web Worker (Issue #13)", () => {
  // =========================================================================
  // 1. Initialisation & Environnement
  // =========================================================================
  describe("1. Initialisation du runtime & extensions supportées", () => {
    it("déclare les extensions standards requises pour le Bac STI (pdo, sqlite, session, json)", async () => {
      const runner = new PhpRunner();
      const info = await runner.init();

      expect(info.phpVersion).toBe("8.2.14");
      expect(info.extensions).toContain("PDO");
      expect(info.extensions).toContain("pdo_sqlite");
      expect(info.extensions).toContain("session");
      expect(info.extensions).toContain("json");
      expect(info.extensions).toContain("mbstring");
    });
  });

  // =========================================================================
  // 2. Émulation des superglobales
  // =========================================================================
  describe("2. Émulation des superglobales ($ _GET, $_POST, $_SERVER, $_SESSION)", () => {
    it("extrait correctement les query parameters d'une URL GET", () => {
      const { path, query, queryString } = extraireQueryParams(
        "/recherche.php?station=Tunis-Carthage&annee=2023",
      );
      expect(path).toBe("/recherche.php");
      expect(query["station"]).toBe("Tunis-Carthage");
      expect(query["annee"]).toBe("2023");
      expect(queryString).toBe("station=Tunis-Carthage&annee=2023");
    });

    it("prépare un environnement $_SERVER complet et conforme aux serveurs web", () => {
      const req = {
        id: "req-1",
        script: "echo 'ok';",
        method: "POST" as const,
        url: "/enregistrer.php?ref=42",
        post: { nom: "Ben Salah", note: "18" },
      };

      const globals = preparerSuperglobales(req);
      expect(globals.server["REQUEST_METHOD"]).toBe("POST");
      expect(globals.server["SCRIPT_NAME"]).toBe("/enregistrer.php");
      expect(globals.server["SERVER_PORT"]).toBe("80");
      expect(globals.get["ref"]).toBe("42");
      expect(globals.post["nom"]).toBe("Ben Salah");
    });

    it("génère un prélude PHP valide contenant l'injection des superglobales", () => {
      const globals = preparerSuperglobales({
        id: "req-2",
        script: "echo 'test';",
        post: { user: "eleve1" },
      });

      const prelude = genererPreludePhp(globals);
      expect(prelude).toContain("$_POST = json_decode(");
      expect(prelude).toContain("$_SERVER = json_decode(");
      expect(prelude).toContain("$_SESSION");
    });
  });

  // =========================================================================
  // 3. Exécution de scripts PHP et affichage (stdout)
  // =========================================================================
  describe("3. Exécution de code PHP et capture de stdout", () => {
    it("exécute un script simple et capture stdout avec exitCode 0", async () => {
      const runner = new PhpRunner();
      const code = `
        <?php
        $titre = "Labo STI Bac 2024";
        echo "<h1>" . $titre . "</h1>";
        ?>
      `;

      const res = await runner.execute(code);
      expect(res.success).toBe(true);
      expect(res.stdout).toContain("<h1>Labo STI Bac 2024</h1>");
      expect(res.exitCode).toBe(0);
      expect(res.timedOut).toBe(false);
      expect(res.memoryExceeded).toBe(false);
    });

    it("reflète les valeurs transmises par $_POST dans la sortie", async () => {
      const runner = new PhpRunner();
      const code = `
        <?php
        $nom = $_POST['nom'];
        $prenom = $_POST['prenom'];
        echo "<p>Candidat : " . $nom . " " . $prenom . "</p>";
        ?>
      `;

      const res = await runner.execute({
        script: code,
        method: "POST",
        post: { nom: "Trabelsi", prenom: "Nour" },
      });

      expect(res.success).toBe(true);
      expect(res.stdout).toContain("<p>Candidat : Trabelsi Nour</p>");
    });
  });

  // =========================================================================
  // 4. Persistance des sessions entre requêtes
  // =========================================================================
  describe("4. Persistance des sessions $_SESSION", () => {
    it("maintient l'état de la session entre deux requêtes consécutives", async () => {
      const runner = new PhpRunner();

      // Première requête : connexion et mise en session
      const code1 = `
        <?php
        session_start();
        $_SESSION['cin'] = '08765432';
        $_SESSION['role'] = 'eleve';
        echo "Connecté";
        ?>
      `;

      const res1 = await runner.execute(code1, { maintainSession: true });
      expect(res1.success).toBe(true);
      expect(runner.getSession()["cin"]).toBe("08765432");

      // Deuxième requête : lecture de la session sans ré-authentification
      const code2 = `
        <?php
        session_start();
        $cin = $_SESSION['cin'];
        echo "Session CIN : " . $cin;
        ?>
      `;

      const res2 = await runner.execute(code2, { maintainSession: true });
      expect(res2.success).toBe(true);
      expect(res2.stdout).toContain("Session CIN : 08765432");
    });

    it("réinitialise la session proprement via runner.reset()", async () => {
      const runner = new PhpRunner();
      runner.setSession({ auth: true, user: "Sami" });
      expect(runner.getSession()["user"]).toBe("Sami");

      runner.reset();
      expect(runner.getSession()).toEqual({});
    });
  });

  // =========================================================================
  // 5. Watchdog 3s et Boucle Infinie (T-10)
  // =========================================================================
  describe("5. Watchdog 3s et interruption des boucles infinies (T-10)", () => {
    it("détecte statiquement les motifs de boucle infinie classique", () => {
      expect(detecterBoucleInfinieStatique("while (true) { $i++; }")).toBe(true);
      expect(detecterBoucleInfinieStatique("for (;;) { echo 1; }")).toBe(true);
      expect(detecterBoucleInfinieStatique("do { $x = 1; } while (1);")).toBe(true);
      expect(detecterBoucleInfinieStatique("for ($i = 0; $i < 10; $i++) { echo $i; }")).toBe(false);
    });

    it("interrompt un script contenant une boucle infinie et renvoie le message bienveillant T-10", async () => {
      const runner = new PhpRunner();
      const codeInfini = `
        <?php
        $i = 0;
        while (true) {
          $i++;
        }
        echo "Fin";
        ?>
      `;

      const res = await runner.execute(codeInfini);
      expect(res.timedOut).toBe(true);
      expect(res.success).toBe(false);
      expect(res.exitCode).toBe(124);
      expect(res.friendlyMessage).toContain(
        "Interruption de sécurité : Le temps d'exécution a dépassé la limite autorisée",
      );
      expect(res.friendlyMessage).toContain("Vérifiez la présence éventuelle d'une boucle infinie");
    });

    it("permet l'exécution immédiate d'un script normal après une interruption de boucle infinie", async () => {
      const runner = new PhpRunner();

      // 1. Script avec boucle infinie
      await runner.execute("<?php while(true) {} ?>");

      // 2. Script suivant tout à fait valide
      const validRes = await runner.execute("<?php echo 'Reprise réussie'; ?>");
      expect(validRes.success).toBe(true);
      expect(validRes.stdout).toContain("Reprise réussie");
      expect(validRes.timedOut).toBe(false);
    });
  });

  // =========================================================================
  // 6. Confinement Mémoire à 64 Mo max (T-10)
  // =========================================================================
  describe("6. Confinement mémoire à 64 Mo max (T-10)", () => {
    it("interrompt un script tentant d'allouer plus de 64 Mo de RAM", async () => {
      const runner = new PhpRunner({ memoryLimitBytes: MAX_MEMORY_LIMIT_BYTES });
      const codeMemoireMassive = `
        <?php
        // Tentative d'allocation géante
        $buffer = str_repeat("A", 100000000); // ~100 Mo
        echo strlen($buffer);
        ?>
      `;

      const res = await runner.execute(codeMemoireMassive);
      expect(res.memoryExceeded).toBe(true);
      expect(res.success).toBe(false);
      expect(res.exitCode).toBe(255);
      expect(res.friendlyMessage).toContain("Dépassement de quota mémoire");
      expect(res.friendlyMessage).toContain("64 Mo");
    });
  });

  // =========================================================================
  // 7. Troncature stdout à 1 Mo max
  // =========================================================================
  describe("7. Troncature de la sortie stdout à 1 Mo max", () => {
    it("tronque la sortie si celle-ci dépasse la taille maximale autorisée", async () => {
      const runner = new PhpRunner({ maxStdoutBytes: 50 });
      const code = `
        <?php
        echo "Cette chaîne est délibérément très longue pour tester la troncature de la sortie standard.";
        ?>
      `;

      const res = await runner.execute(code);
      expect(res.stdout).toContain("[... Sortie tronquée à 1 Mo max ...]");
    });
  });

  // =========================================================================
  // 8. Capture des en-têtes HTTP (header)
  // =========================================================================
  describe("8. Capture des en-têtes HTTP", () => {
    it("capture les redirections Location et le type de contenu", async () => {
      const runner = new PhpRunner();
      const code = `
        <?php
        header('Location: accueil.php');
        header('Content-Type: application/json');
        echo json_encode(['status' => 'redirected']);
        ?>
      `;

      const res = await runner.execute(code);
      expect(res.headers["location"]).toBe("accueil.php");
      expect(res.headers["content-type"]).toBe("application/json");
    });
  });

  // =========================================================================
  // 9. Gestion des erreurs de syntaxe
  // =========================================================================
  describe("9. Détection et rapport des erreurs de syntaxe", () => {
    it("détecte une syntaxe invalide et retourne une erreur claire dans stderr", async () => {
      const runner = new PhpRunner();
      const codeInvalide = `
        <?php
        echo "Parenthèse non fermée" . substr("test", 1;
        ?>
      `;

      const res = await runner.execute(codeInvalide);
      expect(res.success).toBe(false);
      expect(res.exitCode).toBe(255);
      expect(res.stderr).toContain("PHP Parse error");
    });
  });
});
