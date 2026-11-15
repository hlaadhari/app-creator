---
name: labo-pedagogical-bench
description: >-
  Guide de création, modification et validation des sujets d'exercices, TP et examens blancs (pratiques et écrits)
  dans content/ sur Labo STI. À activer lors de toute intervention sur content/, les fichiers criteria.json,
  manifest.json, COUVERTURE.md, le banc didactique à 3 variantes ou les épreuves écrites théoriques.
---

# Banc Didactique & Ingénierie Pédagogique — Labo STI

Ce skill encadre la conception et la validation des sujets du programme officiel de **4e année Baccalauréat Sciences de l'Informatique (STI — Tunisie)**.

## 1. Principes Pédagogiques Inviolables

1. **Référentiel exclusif Bac STI Tunisie (PED-01)** :
   - Aucune mention de filières étrangères hors contexte (interdiction absolue du terme `STI2D`).
   - Chaque sujet doit déclarer sa provenance vérifiable et ses compétences cibles dans `manifest.json`.
2. **Immuabilité des versions publiées (T-09)** :
   - Une version publiée dans `sujet_versions` (`publiee = true`) ne se modifie jamais en base ; toute évolution passe par une nouvelle version (`numero + 1`).
3. **Banc didactique obligatoire à 3 variantes (PED-02)** :
   - Tout sujet dans `content/<id>/` doit posséder :
     - `initial/` : code de départ fourni à l'élève. **Doit obtenir 0 point** (ou `score_initial_attendu` documenté dans `manifest.json`).
     - `solution/` : solution canonique A. **Doit obtenir 100 % des points auto-évaluables**.
     - `solution-alt/` : solution alternative B (approche ou écriture différente mais valide). **Doit obtenir 100 % des points auto-évaluables**.
     - `solution-invalide/` : solution incomplète ou erronée. **Doit obtenir un score strictement inférieur au maximum**.

---

## 2. Structure Canonique d'un Sujet (`content/<sujet-id>/`)

### A. Sujets Pratiques Web / PHP / SQL (`ex-*`, `tp-*`, `exam-bac*`)

```text
content/<sujet-id>/
├── manifest.json          # Métadonnées, barème, provenance, compétences, fichiers initiaux
├── enonce.md              # Énoncé complet fidèle à l'épreuve officielle
├── COUVERTURE.md          # Matrice de couverture et indices progressifs à 3 niveaux
├── criteria.json          # Grille de critères validée par schéma Zod strict (.strict())
├── db/
│   └── init.sql           # Script SQL d'initialisation de la base (si sujet SQL/PHP)
├── initial/               # Fichiers de départ (score attendu = 0)
├── solution/              # Variante valide A (canonique -> score max)
├── solution-alt/          # Variante valide B (alternative -> score max)
└── solution-invalide/     # Variante invalide (échec partiel ou total contrôlé)
```

### B. Épreuves Écrites Théoriques (`exam-bac*-ecrit`)

En plus des dossiers ci-dessus :
- `initial/reponses.json` et `initial/reponses.sql` (vides au départ).
- `solution/reponses.json`, `solution/reponses.sql` et `solution/init.sql`.
- `solution-alt/reponses.json`, `solution-alt/reponses.sql` et `solution-alt/init.sql`.
- `solution-invalide/reponses.json`, `solution-invalide/reponses.sql` et `solution-invalide/init.sql`.
- **Barème serveur obligatoire** : toute épreuve écrite doit avoir son barème de correction enregistré côté serveur via une migration dans `supabase/migrations/` (table `baremes_examen_ecrit` / fonctions de correction serveur).

---

## 3. Format Strict de `criteria.json` (TEC-06)

Le fichier `criteria.json` est validé au build par `CriteriaListSchema` (`src/lib/evaluation/criteria-schema.ts`) avec `.strict()` (tout champ inconnu provoque l'échec du build).

- Chaque critère comporte :
  - `id` (ex: `"EX25-01"`), `label`, `points`, `category`, `page` (optionnel pour cibler un fichier HTML/PHP précis).
  - `type` : `"dom_query"`, `"css_property"`, `"js_function"`, `"js_test_cas"`, `"sql_query"`, `"php_output"`, `"custom"`, etc.
  - `indices` (optionnel) : tableau de 3 chaînes correspondant aux niveaux `[Conceptuel, Syntaxique, Extrait]`.
- Les critères SQL et PHP sont évalués automatiquement sur l'état réel de la base relationnelle et du simulateur procédural PHP/MySQLi (PED-03).

---

## 4. Commandes de Validation du Banc Didactique

Après toute modification dans `content/` ou `src/lib/content/all-subjects.ts`, exécuter :

```powershell
# 1. Validation Zod stricte + vérification que initial/ obtient 0 point
bun run validate:criteria

# 2. Suite complète des tests du banc didactique et de provenance
bun run test src/test/banc-didactique-content.test.ts src/test/initial-depart.test.ts src/test/criteria-schema-strict.test.ts src/test/referentiel-provenance.test.ts src/test/indices-progressifs-couverture.test.tsx
```
