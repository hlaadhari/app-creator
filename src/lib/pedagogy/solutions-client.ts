/**
 * Service de déblocage et consultation tracée des corrigés de référence (PRD Jalon M5, T-04, T-06)
 * Respecte strictement l'interdiction d'accès en mode examen actif.
 */

import { supabase } from "@/integrations/supabase/client";

export interface SolutionFile {
  path: string;
  content: string;
}

export interface SolutionConsultationResponse {
  success: boolean;
  files?: SolutionFile[];
  error?: string;
  dateDeblocage?: string;
  mode?: "distant" | "catalogue";
}

// Corrigés canoniques de référence pour le catalogue embarqué
const CATALOGUE_SOLUTIONS: Record<string, SolutionFile[]> = {
  "carte-profil": [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Profil</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <article class="carte">
    <h1>Hatem</h1>
    <p>Développeur passionné d'informatique.</p>
    <ul>
      <li>Programmation</li>
      <li>Électronique</li>
      <li>Systèmes réseau</li>
    </ul>
    <a href="mailto:contact@sti.tn">Me contacter</a>
  </article>
</body>
</html>`,
    },
    {
      path: "style.css",
      content: `body {
  font-family: sans-serif;
  background-color: #f4f6f8;
}
.carte {
  max-width: 400px;
  margin: 20px auto;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`,
    },
  ],
  "mise-en-forme": [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mise en forme CSS</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main>
    <div class="boite">
      <h1>Bienvenue</h1>
      <p>Exercice de mise en forme CSS3.</p>
    </div>
  </main>
</body>
</html>`,
    },
    {
      path: "style.css",
      content: `main {
  font-family: sans-serif;
  padding: 1rem;
}
.boite {
  border: 2px solid #2563eb;
  padding: 20px;
  margin: 10px;
  background-color: #eff6ff;
  border-radius: 8px;
}
h1 {
  color: #1e3a8a;
  text-align: center;
}`,
    },
  ],
  "form-validation": [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Inscription</title>
</head>
<body>
  <form id="inscription">
    <input type="text" id="cin" name="cin" placeholder="8 chiffres du CIN" maxlength="8">
    <button type="submit" id="btn-valider">Valider</button>
  </form>
  <p id="erreur"></p>
  <script src="script.js"></script>
</body>
</html>`,
    },
    {
      path: "script.js",
      content: `function verifCIN(cin) {
  return /^[0-9]{8}$/.test(cin);
}

document.getElementById("inscription")?.addEventListener("submit", (e) => {
  const cin = (document.getElementById("cin") as HTMLInputElement)?.value ?? "";
  const err = document.getElementById("erreur");
  if (!verifCIN(cin)) {
    e.preventDefault();
    if (err) err.textContent = "Le CIN doit comporter exactement 8 chiffres.";
  }
});`,
    },
  ],
  "compteur-clics": [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Compteur</title>
</head>
<body>
  <button id="plus">+1</button>
  <span id="total">0</span>
  <script src="script.js"></script>
</body>
</html>`,
    },
    {
      path: "script.js",
      content: `let total = 0;
const btn = document.getElementById("plus");
const span = document.getElementById("total");

btn?.addEventListener("click", () => {
  total++;
  if (span) {
    span.textContent = String(total);
    if (total >= 5) {
      span.classList.add("max");
    }
  }
});`,
    },
  ],
  "ex-html-css-01": [
    {
      path: "index.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Mise en page CSS3</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="L1">
    <div class="b1">Bloc 1</div>
    <div class="b2">Bloc 2</div>
  </div>
  <h1 class="titre">Titre avec transition</h1>
</body>
</html>`,
    },
    {
      path: "style.css",
      content: `.L1 {
  display: flex;
  gap: 16px;
}
.b1, .b2 {
  display: inline-block;
  padding: 16px;
  border: 1px solid #cbd5e1;
}
.titre {
  transition: color 0.3s ease, transform 0.3s ease;
}
.titre:hover {
  color: #3b82f6;
  transform: scale(1.02);
}`,
    },
  ],
  "ex-js-01": [
    {
      path: "formulaire.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Contrôle CIN</title>
</head>
<body>
  <form id="f1" onsubmit="return verif()">
    <input type="text" id="cin" name="cin" />
    <button type="submit">Vérifier</button>
  </form>
  <script src="controle.js"></script>
</body>
</html>`,
    },
    {
      path: "controle.js",
      content: `function verif() {
  const cin = document.getElementById("cin").value.trim();
  if (cin.length !== 8) {
    alert("Le CIN doit comporter exactement 8 chiffres.");
    return false;
  }
  for (let i = 0; i < 8; i++) {
    if (cin[i] < '0' || cin[i] > '9') {
      alert("Le CIN ne doit contenir que des chiffres.");
      return false;
    }
  }
  return true;
}`,
    },
  ],
  "ex-sql-01": [
    {
      path: "schema.sql",
      content: `CREATE TABLE IF NOT EXISTS stagiaire (
  cin VARCHAR(8) PRIMARY KEY,
  nom VARCHAR(50) NOT NULL,
  prenom VARCHAR(50) NOT NULL,
  age INT CHECK (age >= 16 AND age <= 30),
  filiere_id INT,
  CONSTRAINT fk_filiere FOREIGN KEY (filiere_id) REFERENCES filiere(id) ON DELETE CASCADE
);`,
    },
  ],
  "tp-fs-01": [
    {
      path: "Don.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Don Lycée</title>
  <link rel="stylesheet" href="mesStyles.css">
  <script src="controles.js"></script>
</head>
<body>
  <form action="enregistrer.php" method="POST" onsubmit="return valider()">
    <fieldset>
      <legend>Formulaire de don</legend>
      <input type="text" id="nom" name="nom" required>
      <input type="number" id="qte" name="qte" min="1" required>
      <button type="submit">Valider le don</button>
    </fieldset>
  </form>
</body>
</html>`,
    },
    {
      path: "mesStyles.css",
      content: `body { font-family: sans-serif; margin: 2rem; }
fieldset { border: 2px solid #2563eb; border-radius: 8px; padding: 1.5rem; }`,
    },
    {
      path: "controles.js",
      content: `function valider() {
  const qte = document.getElementById("qte").value;
  return Number(qte) > 0;
}`,
    },
  ],
  "exam-bac2023-location-habits": [
    {
      path: "location.html",
      content: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Location d'habits</title>
  <link rel="stylesheet" href="mesStyles.css">
  <script src="controls.js"></script>
</head>
<body>
  <form action="location.php" method="POST" onsubmit="return verif2()">
    <input type="text" id="ncin" name="ncin" maxlength="8">
    <button type="submit">Louer</button>
  </form>
</body>
</html>`,
    },
    {
      path: "controls.js",
      content: `function verif2() {
  const ncin = document.getElementById("ncin").value.trim();
  return /^[0-9]{8}$/.test(ncin);
}`,
    },
  ],
};

/**
 * Journalise une tentative suspecte d'accès au corrigé en plein examen.
 * Passe par la fonction SQL journaliser_incident : l'acteur et la date sont imposés par le serveur.
 */
async function journaliserTentativeFraude(sujetId: string, motif?: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("journaliser_incident", {
      _type: "TENTATIVE_ACCES_CORRIGE_EN_EXAMEN",
      _meta: {
        sujet_id: sujetId,
        motif: motif ?? "Tentative d'ouverture de corrigé en examen",
      },
    });
    if (error) {
      console.warn("[Sécurité] Incident non consigné :", error.message);
    }
  } catch (err) {
    console.warn("[Sécurité] Échec consignation incident :", err);
  }
}

/**
 * Consulte le corrigé officiel de référence d'un sujet (PRD F-44, T-04, T-06).
 * GARDE-FOU STRICT : Bloque catégoriquement si l'utilisateur est en mode examen actif !
 */
export async function consulterSolutionReference(params: {
  sujetId: string;
  versionId?: string | null | undefined;
  estEnExamen?: boolean | undefined;
  motif?: string | undefined;
}): Promise<SolutionConsultationResponse> {
  // 1. RÈGLE STRICTE T-04 / T-06 : Blocage en mode examen
  if (params.estEnExamen) {
    await journaliserTentativeFraude(params.sujetId, params.motif);
    return {
      success: false,
      error:
        "Accès au corrigé strictement interdit : une session d'examen est active sur votre poste (T-04 / T-06).",
    };
  }

  const now = new Date().toISOString();

  // 2. Si une version Supabase existe, tenter l'appel de la RPC sécurisée debloquer_solution
  if (params.versionId) {
    try {
      const { data, error } = await supabase.rpc("debloquer_solution", {
        p_version_id: params.versionId,
        p_motif: params.motif ?? "consultation_eleve",
      });

      if (!error && data && data.length > 0) {
        return {
          success: true,
          files: data.map((d) => ({
            path: d.chemin,
            content: d.contenu,
          })),
          dateDeblocage: now,
          mode: "distant",
        };
      }

      if (error && error.message.includes("interdit")) {
        return {
          success: false,
          error: error.message,
        };
      }
    } catch (err) {
      console.warn("[Solutions] RPC distante non disponible, bascule catalogue :", err);
    }
  }

  // 3. Repli résilient : Corrigé officiel issu du catalogue didactique validé
  const files = CATALOGUE_SOLUTIONS[params.sujetId];
  if (files && files.length > 0) {
    return {
      success: true,
      files,
      dateDeblocage: now,
      mode: "catalogue",
    };
  }

  return {
    success: false,
    error: "Aucun corrigé de référence officiel n'a encore été publié pour ce sujet.",
  };
}
