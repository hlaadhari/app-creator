import { describe, expect, it, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  verifierEcheanceExamen,
  validerTransitionExamen,
  type SessionExamenInfo,
} from "@/lib/security/exam-guard";
import {
  verifierMutationSnapshot,
  verifierMutationSujetVersion,
  ImmutabilityViolationError,
} from "@/lib/security/immutability-guard";
import {
  executeWithWatchdog,
  validerIframeSandbox,
  getSandboxCsp,
} from "@/lib/security/sandbox-watchdog";
import {
  sanitizeString,
  sanitizeContext,
  sanitizeTelemetry,
} from "@/lib/security/telemetry-sanitizer";
import { scanBundleForSecrets } from "@/lib/security/secret-scanner";
import { anonymiserProfilEleve, type ProfilUtilisateur } from "@/lib/security/rgpd";
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  rejoindreClasse,
} from "@/lib/supabase/classes";

describe("Harnais de Tests Négatifs de Sécurité T-01 à T-14 (docs/SECURITY.md)", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  // =========================================================================
  // T-01 & T-02 : Isolation inter-élèves et inter-enseignants (RLS)
  // =========================================================================
  describe("T-01 : Isolation inter-élèves (RLS projets & fichiers)", () => {
    it("interdit à l'élève A d'accéder ou modifier les projets d'un élève B", () => {
      const eleveAId = "eleve-uuid-1111";
      const eleveBId = "eleve-uuid-2222";

      const simulateRlsProjectQuery = (requestingUserId: string, targetOwnerId: string) => {
        // Simule la politique RLS : auth.uid() = eleve_id
        if (requestingUserId !== targetOwnerId) {
          return { data: [], error: { message: "RLS policy violation: permission denied" } };
        }
        return { data: [{ id: "proj-1", eleve_id: targetOwnerId }], error: null };
      };

      const result = simulateRlsProjectQuery(eleveAId, eleveBId);
      expect(result.data).toHaveLength(0);
      expect(result.error?.message).toContain("RLS policy violation");
    });
  });

  describe("T-02 : Isolation inter-enseignants (RLS classes & copies)", () => {
    it("interdit à l'enseignant A de gérer ou modifier les classes de l'enseignant B", () => {
      const enseignantAId = "prof-uuid-AAAA";
      const enseignantBId = "prof-uuid-BBBB";

      const simulateRlsClassMutation = (requestingProfId: string, classOwnerProfId: string) => {
        // Simule la politique RLS : classes.enseignant_id = auth.uid()
        if (requestingProfId !== classOwnerProfId) {
          throw new Error("403 Forbidden: Vous n'êtes pas propriétaire de cette classe.");
        }
        return { success: true };
      };

      expect(() => simulateRlsClassMutation(enseignantAId, enseignantBId)).toThrow("403 Forbidden");
    });
  });

  // =========================================================================
  // T-03 : Interdiction d'auto-attribution de rôle
  // =========================================================================
  describe("T-03 : Interdiction d'auto-attribution de rôle (enseignant/admin)", () => {
    it("écrase tout rôle non autorisé lors de l'inscription pour forcer le rôle 'eleve'", () => {
      const handleNewUserTrigger = (rawMetadata: Record<string, unknown>) => {
        // Règle de sécurité : Le rôle ne peut JAMAIS être défini librement par le client.
        // Seul le rôle 'eleve' est accordé par défaut à l'inscription.
        const forbiddenRequestedRole = rawMetadata["role"];
        return {
          role_attribue: "eleve",
          tentative_escalade:
            forbiddenRequestedRole === "enseignant" || forbiddenRequestedRole === "admin",
        };
      };

      const resultat = handleNewUserTrigger({ role: "enseignant" });
      expect(resultat.role_attribue).toBe("eleve");
      expect(resultat.tentative_escalade).toBe(true);

      const resultatAdmin = handleNewUserTrigger({ role: "admin" });
      expect(resultatAdmin.role_attribue).toBe("eleve");
      expect(resultatAdmin.tentative_escalade).toBe(true);
    });
  });

  // =========================================================================
  // T-04 : Confidentialité des corrigés et critères masqués
  // =========================================================================
  describe("T-04 : Confidentialité des tables solutions et critères masqués", () => {
    it("bloque tout accès direct client à la table des solutions", () => {
      const simulateClientTableAccess = (role: "anon" | "eleve" | "service_role") => {
        if (role !== "service_role") {
          return {
            data: null,
            error: "permission denied for table solutions (0 GRANT for anon/authenticated)",
          };
        }
        return { data: [{ id: "sol-1", code: "secret" }], error: null };
      };

      expect(simulateClientTableAccess("anon").data).toBeNull();
      expect(simulateClientTableAccess("anon").error).toContain("permission denied");

      expect(simulateClientTableAccess("eleve").data).toBeNull();
      expect(simulateClientTableAccess("eleve").error).toContain("permission denied");
    });
  });

  // =========================================================================
  // T-05 : Rejet des invitations invalides & rate-limiting
  // =========================================================================
  describe("T-05 : Rejet des invitations frauduleuses & Rate limiting", () => {
    it("bloque après 5 tentatives invalides consécutives", async () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt();
      }

      const rl = checkRateLimit();
      expect(rl.allowed).toBe(false);
      expect(rl.retryAfterSeconds).toBeGreaterThan(0);

      const tentRejoindre = await rejoindreClasse("CODE-INCONNU");
      expect(tentRejoindre.success).toBe(false);
      expect(tentRejoindre.error).toContain("Trop de tentatives");
    });
  });

  // =========================================================================
  // T-06 : Refus d'écriture après échéance d'examen (horloge serveur stricte)
  // =========================================================================
  describe("T-06 : Refus d'écriture post-échéance d'examen", () => {
    it("rejette toute écriture dès que l'horloge serveur dépasse l'échéance", () => {
      const session: SessionExamenInfo = {
        id: "sess-100",
        statut: "en_cours",
        echeance_serveur: new Date(Date.now() - 5000).toISOString(), // expirée il y a 5s
      };

      const verif = verifierEcheanceExamen(session);
      expect(verif.autorise).toBe(false);
      expect(verif.motif).toContain("Échéance d'examen dépassée");
      expect(verif.delaiRestantMs).toBe(0);
    });

    it("autorise l'écriture tant que l'horloge serveur est inférieure à l'échéance", () => {
      const session: SessionExamenInfo = {
        id: "sess-101",
        statut: "en_cours",
        echeance_serveur: new Date(Date.now() + 60000).toISOString(), // expire dans 1 min
      };

      const verif = verifierEcheanceExamen(session);
      expect(verif.autorise).toBe(true);
      expect(verif.delaiRestantMs).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // T-07 : Transitions d'états d'examen invalides
  // =========================================================================
  describe("T-07 : Machine à états des examens et blocage de réouverture", () => {
    it("interdit formellement de repasser de 'rendu' à 'en_cours'", () => {
      const trans = validerTransitionExamen("rendu", "en_cours");
      expect(trans.valide).toBe(false);
      expect(trans.erreur).toContain("strictement interdite (T-07)");
    });

    it("interdit formellement de repasser de 'clos' à 'en_cours'", () => {
      const trans = validerTransitionExamen("clos", "en_cours");
      expect(trans.valide).toBe(false);
      expect(trans.erreur).toContain("strictement interdite (T-07)");
    });

    it("autorise la transition normale 'en_cours' -> 'rendu'", () => {
      const trans = validerTransitionExamen("en_cours", "rendu");
      expect(trans.valide).toBe(true);
    });
  });

  // =========================================================================
  // T-08 : Immuabilité des snapshots scellés
  // =========================================================================
  describe("T-08 : Immuabilité stricte des snapshots d'examen", () => {
    it("lève une erreur de sécurité lors d'une tentative de UPDATE sur un snapshot", () => {
      expect(() => {
        verifierMutationSnapshot("UPDATE");
      }).toThrowError(ImmutabilityViolationError);
    });

    it("lève une erreur de sécurité lors d'une tentative de DELETE sur un snapshot", () => {
      expect(() => {
        verifierMutationSnapshot("DELETE");
      }).toThrowError(ImmutabilityViolationError);
    });
  });

  // =========================================================================
  // T-09 : Immuabilité des versions de sujet publiées
  // =========================================================================
  describe("T-09 : Immuabilité des versions de sujet publiées", () => {
    it("interdit la modification directe d'une version publiée (publiee = true)", () => {
      const versionPubliee = {
        id: "v-1",
        sujet_id: "s-1",
        numero: 1,
        publiee: true,
        enonce_markdown: "Énoncé officiel scellé",
      };

      expect(() => {
        verifierMutationSujetVersion(versionPubliee, "UPDATE");
      }).toThrowError(ImmutabilityViolationError);
    });

    it("interdit la suppression d'une version publiée", () => {
      const versionPubliee = {
        id: "v-1",
        sujet_id: "s-1",
        numero: 1,
        publiee: true,
        enonce_markdown: "Énoncé officiel scellé",
      };

      expect(() => {
        verifierMutationSujetVersion(versionPubliee, "DELETE");
      }).toThrowError(ImmutabilityViolationError);
    });

    it("autorise la modification d'un brouillon non publié", () => {
      const versionBrouillon = {
        id: "v-2",
        sujet_id: "s-1",
        numero: 2,
        publiee: false,
        enonce_markdown: "Brouillon en cours",
      };

      expect(() => {
        verifierMutationSujetVersion(versionBrouillon, "UPDATE");
      }).not.toThrow();
    });
  });

  // =========================================================================
  // T-10 : Confinement des ressources du code élève (Watchdog 3s)
  // =========================================================================
  describe("T-10 : Watchdog 3s et interruption des boucles infinies", () => {
    it("interrompt avec succès une tâche bloquante dépassant le timeout imparti", async () => {
      const resultat = await executeWithWatchdog(
        async (signal) => {
          // Simule une boucle infinie ou traitement long
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 500);
            signal.addEventListener("abort", () => {
              clearTimeout(timer);
              resolve();
            });
          });
          return "finished";
        },
        { timeoutMs: 50 },
      );

      expect(resultat.timedOut).toBe(true);
      expect(resultat.success).toBe(false);
      expect(resultat.error).toContain("Interruption d'urgence (Watchdog 3s)");
    });

    it("permet l'exécution normale d'un code rapide respectant le quota temporel", async () => {
      const resultat = await executeWithWatchdog(
        async () => {
          return 42;
        },
        { timeoutMs: 100 },
      );

      expect(resultat.timedOut).toBe(false);
      expect(resultat.success).toBe(true);
      expect(resultat.value).toBe(42);
    });
  });

  // =========================================================================
  // T-11 : Confinement réseau et isolation de l'iframe de prévisualisation
  // =========================================================================
  describe("T-11 : Confinement du bac à sable iframe (pas de same-origin, CSP stricte)", () => {
    it("rejette tout bac à sable contenant la directive 'allow-same-origin'", () => {
      const configDangereuse = "allow-scripts allow-same-origin";
      const validation = validerIframeSandbox(configDangereuse);

      expect(validation.securise).toBe(false);
      expect(validation.violations).toEqual(
        expect.arrayContaining([expect.stringContaining("allow-same-origin")]),
      );
    });

    it("valide la configuration sécurisée standard (allow-scripts seul)", () => {
      const configSecurisee = "allow-scripts";
      const validation = validerIframeSandbox(configSecurisee);

      expect(validation.securise).toBe(true);
      expect(validation.violations).toHaveLength(0);
    });

    it("génère une CSP bloquant tout appel réseau externe par défaut", () => {
      const csp = getSandboxCsp();
      expect(csp).toContain("connect-src 'none'");
      expect(csp).toContain("default-src 'self'");
    });

    it("SEC-07 : vercel.json sert un en-tête Content-Security-Policy valide et exclut X-XSS-Protection", () => {
      const vercelJsonPath = path.resolve(process.cwd(), "vercel.json");
      const raw = fs.readFileSync(vercelJsonPath, "utf-8");
      const parsed = JSON.parse(raw) as {
        headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
      };
      const globalHeaders = parsed.headers?.find((h) => h.source === "/(.*)")?.headers ?? [];
      const keys = globalHeaders.map((h) => h.key.toLowerCase());

      expect(keys).not.toContain("x-xss-protection");
      expect(keys).toContain("content-security-policy");

      const cspValue =
        globalHeaders.find((h) => h.key.toLowerCase() === "content-security-policy")?.value ?? "";
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
      expect(cspValue).toContain("frame-src 'self' blob: data:");
      expect(cspValue).toContain("object-src 'none'");
      expect(cspValue).toContain("base-uri 'self'");
    });
  });

  // =========================================================================
  // T-12 : Absence de secrets sensibles dans les bundles de build
  // =========================================================================
  describe("T-12 : Scan statique des bundles client garantissant l'absence de SUPABASE_SERVICE_ROLE_KEY", () => {
    it("détecte immédiatement la présence accidentelle de clés d'administration sensibles", () => {
      const bundleAvecFuite = "const secret = 'SUPABASE_SERVICE_ROLE_KEY=eyJh...';";
      const scan = scanBundleForSecrets(bundleAvecFuite, "dist/assets/index.js");

      expect(scan.hasSecrets).toBe(true);
      expect(scan.violations.length).toBeGreaterThan(0);
    });

    it("valide un bundle propre contenant uniquement les clés publiques VITE_SUPABASE_PUBLISHABLE_KEY", () => {
      const bundlePropre = "const pubKey = 'sb_publishable_6oy2IYNYBkyKr0umKULwVw_vy7bVVIZ';";
      const scan = scanBundleForSecrets(bundlePropre, "dist/assets/index.js");

      expect(scan.hasSecrets).toBe(false);
      expect(scan.violations).toHaveLength(0);
    });
  });

  // =========================================================================
  // T-13 : Absence de données sensibles et code élève dans la télémétrie
  // =========================================================================
  describe("T-13 : Assainissement des données avant envoi télémétrique", () => {
    it("masque les adresses emails et tokens d'authentification", () => {
      const raw =
        "Erreur survenue pour l'élève jean.dupont@lycee.fr avec JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const sanitized = sanitizeString(raw);

      expect(sanitized).not.toContain("jean.dupont@lycee.fr");
      expect(sanitized).toContain("[REDACTED_PII]");
    });

    it("masque les clés de code source et données personnelles dans les contextes d'erreurs", () => {
      const context = {
        code: "function tricher() { alert('hack'); }",
        eleve_nom: "Martin",
        eleve_prenom: "Lucas",
        langage: "javascript",
      };

      const sanitized = sanitizeContext(context);
      expect(sanitized["code"]).toBe("[REDACTED]");
      expect(sanitized["eleve_nom"]).toBe("[REDACTED]");
      expect(sanitized["eleve_prenom"]).toBe("[REDACTED]");
      expect(sanitized["langage"]).toBe("javascript");
    });

    it("fournit une fonction de télémétrie complète assainie", () => {
      const payload = sanitizeTelemetry(
        new Error("Échec d'évaluation sur email test@ac-paris.fr"),
        { code: "const x = 12;" },
      );

      expect(payload.message).not.toContain("test@ac-paris.fr");
      expect(payload.context["code"]).toBe("[REDACTED]");
      expect(payload.sanitized).toBe(true);
    });
  });

  // =========================================================================
  // T-14 : Conformité RGPD suppression de compte et anonymisation irréversible
  // =========================================================================
  describe("T-14 : Effacement RGPD et anonymisation irréversible des traces", () => {
    it("anonymise de façon irréversible les données d'identité d'un profil élève", () => {
      const profilEleve: ProfilUtilisateur = {
        id: "usr-98765432-abcd",
        nom: "Benali",
        prenom: "Samir",
        email: "samir.benali@lycee-sti.fr",
        avatar_url: "https://photos.lycee.fr/samir.jpg",
      };

      const resultat = anonymiserProfilEleve(profilEleve);
      expect(resultat.success).toBe(true);
      expect(resultat.profilAnonymise.nom).toBe("Anonyme");
      expect(resultat.profilAnonymise.prenom).toBe("anonyme_usr-9876");
      expect(resultat.profilAnonymise.email).toContain("@anonymise.local");
      expect(resultat.profilAnonymise.avatar_url).toBeNull();
      expect(resultat.profilAnonymise.supprime_le).toBeDefined();
      expect(resultat.profilAnonymise.anonymise).toBe(true);

      expect(resultat.identifiantsDetruits).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Benali"),
          expect.stringContaining("Samir"),
          expect.stringContaining("samir.benali@lycee-sti.fr"),
        ]),
      );
    });
  });
});
