# Référentiel Pédagogique Officiel — Labo STI

## 1. Cadre Institutionnel et Public Cible

**Labo STI** est la plateforme officielle d'entraînement, d'apprentissage et d'examen blanc dédiée à l'**Épreuve Pratique d'Informatique** du **Baccalauréat Tunisien**, section **Sciences de l'Informatique** (4ème année secondaire — 4ème SI), sous l'identifiant de référentiel officiel `bac-si-tn`.

> [!IMPORTANT]
> **Désambiguïsation Référentiel :**  
> L'acronyme **STI** signifie dans ce projet **Systèmes et Technologies de l'Informatique** (matière d'examen pratique en Tunisie).  
> Ce référentiel ne doit **en aucun cas** être confondu avec la filière technologique française **STI2D** (_Sciences et Technologies de l'Industrie et du Développement Durable_) ni avec la spécialité générale française **NSI** (_Numérique et Sciences Informatiques_).

---

## 2. Structure de l'Épreuve Pratique du Baccalauréat STI

L'épreuve pratique se déroule sur poste informatique individuel :

- **Durée officielle :** 1h30 à 2h00 (selon les sessions).
- **Format du sujet :** Développement d'une application web dynamique complète à partir d'un cahier des charges et d'une base de données relationnelle.
- **Environnement technique standard :**
  - Navigateur moderne (Chrome, Firefox).
  - Éditeur de code (VS Code / Monaco Editor).
  - Serveur Web local avec interpréteur PHP 8 procédural et SGBD relationnel MySQL / MariaDB (via l'extension MySQLi).
  - Formulaires d'authentification et de saisie avec identifiant national (CIN tunisien à 8 chiffres).

---

## 3. Découpage en Modules & Compétences du Programme

Le programme officiel de 4ème Sciences de l'Informatique en STI s'articule autour de trois modules fondamentaux :

### Module A — Technologies Web Côté Client (Front-End)

- **HTML5 Sémantique :** Structure des documents, éléments de formulaire (`<input>`, `<select>`, `<textarea>`, `<button>`), regroupements (`<fieldset>`, `<legend>`), tableaux de données (`<table>`, `<th>`, `<tr>`, `<td>`).
- **CSS3 :** Modèle de boîte (_Box Model_), alignements (_Flexbox_), typographie, sélecteurs avancés, pseudo-classes (`:hover`, `:focus`), transitions fluides.
- **JavaScript Événementiel & Validation :**
  - Sélection des éléments DOM (`getElementById`, `querySelector`, formulaires nommés).
  - Événements de validation (`onsubmit`, gestion des formulaires).
  - Contrôle rigoureux des données saisies : présence obligatoire, longueurs minimales/maximales, formats numériques, expressions régulières (dont format CIN : 8 chiffres numériques obligatoires).

### Module B — Bases de Données Relationnelles & SQL (BDD)

- **Langage de Définition de Données (LDD) :**
  - Conception de tables relationnelles (`CREATE TABLE`).
  - Définition des types de données : `INT`, `VARCHAR(n)`, `CHAR(n)`, `DECIMAL(p,s)`, `DATE`, `DATETIME`.
  - Intégrité référentielle et contraintes : Clé primaire simple et composée (`PRIMARY KEY`), clé étrangère (`FOREIGN KEY ... REFERENCES`), contraintes d'intégrité de domaine (`CHECK`), unicité (`UNIQUE`), non-nullité (`NOT NULL`), valeurs par défaut (`DEFAULT`).
  - Altération de schéma (`ALTER TABLE ... ADD CONSTRAINT`).
- **Langage de Manipulation de Données (LMD) :**
  - Requêtes d'interrogation simples et multi-tables (`SELECT ... FROM ... WHERE`).
  - Jointures relationnelles (`INNER JOIN`, `LEFT JOIN`).
  - Agrégations et regroupements : `COUNT()`, `SUM()`, `AVG()`, `MIN()`, `MAX()`, clauses `GROUP BY`, `HAVING`, `ORDER BY`.
  - Mises à jour et suppressions conditionnelles (`UPDATE`, `DELETE`).

### Module C — Programmation Web Côté Serveur (Back-End PHP/MySQLi)

- **Architecture Client-Serveur :** Réception des requêtes HTTP (`GET`, `POST`), superglobales `$_GET`, `$_POST`, `$_SERVER`, sessions utilisateur `$_SESSION`.
- **Extension PHP MySQLi (Style Procédural) :**
  - Connexion au serveur : `mysqli_connect()`, `mysqli_connect_error()`.
  - Exécution des requêtes : `mysqli_query()`, `mysqli_error()`, `mysqli_errno()`, `mysqli_affected_rows()`.
  - Exploitation des résultats : `mysqli_fetch_array()`, `mysqli_fetch_assoc()`, `mysqli_num_rows()`.
  - Requêtes préparées : `mysqli_prepare()`, `mysqli_stmt_bind_param()`, `mysqli_stmt_execute()`, `mysqli_stmt_get_result()`.
  - Sécurité des données : protection contre les injections SQL (`mysqli_real_escape_string()`, requêtes paramétrées).
- **Rendu Dynamique :** Injection des résultats dans une structure HTML conforme au design demandé.

---

## 4. Taxonomie et Typologie des Sujets du Catalogue

Chaque sujet proposé sur la plateforme est catégorisé selon une taxonomie stricte :

| Type de Sujet       | Libellé Affiché       | Durée Typique | Objectif Pédagogique                                                                       |
| :------------------ | :-------------------- | :------------ | :----------------------------------------------------------------------------------------- |
| `exercice`          | **Exercice**          | 20 à 30 min   | Apprentissage et renforcement d'une compétence unitaire ciblée (HTML, CSS, JS ou LDD SQL). |
| `tp`                | **TP Synthèse**       | 45 à 60 min   | Intégration guidée de plusieurs modules (ex. Formulaire Front + Traitement PHP + BDD).     |
| `annale_officielle` | **Annale Officielle** | 90 à 120 min  | Sujet officiel complet de la session principale ou de contrôle du Baccalauréat tunisien.   |
| `annale_adaptee`    | **Annale Blanche**    | 90 à 120 min  | Sujet d'examen blanc élaboré et calibré selon les exigences exactes du jury national.      |
| `sujet_original`    | **Sujet Original**    | Variable      | Sujet créé par un enseignant vérifié via le Studio de Sujets.                              |

---

## 5. Matrice de Traçabilité des Sujets du Catalogue

| Identifiant Sujet                  | Titre                             | Type                | Année / Session   | Source / Organisme                    | Statut                   |
| :--------------------------------- | :-------------------------------- | :------------------ | :---------------- | :------------------------------------ | :----------------------- |
| `ex-html-css-01`                   | Mise en forme & Transitions CSS3  | `exercice`          | —                 | Labo STI — Équipe Pédagogique         | `valide_pedagogiquement` |
| `ex-js-01`                         | Validation JS - Contrôle CIN      | `exercice`          | —                 | Labo STI — Équipe Pédagogique         | `valide_pedagogiquement` |
| `ex-sql-01`                        | Commandes LDD & Contraintes       | `exercice`          | —                 | Labo STI — Équipe Pédagogique         | `valide_pedagogiquement` |
| `tp-fs-01`                         | Formulaire de Don pour les Lycées | `tp`                | —                 | Labo STI — Équipe Pédagogique         | `valide_pedagogiquement` |
| `tp-fs-02`                         | Consultation Météo & Agrégations  | `tp`                | 2021 (Contrôle)   | Ministère de l'Éducation — Tunisie    | `valide_pedagogiquement` |
| `exam-bac2018-test-drive`          | Test Drive Automobile             | `annale_officielle` | 2018 (Principale) | Ministère de l'Éducation — Tunisie    | `valide_pedagogiquement` |
| `exam-bac2023-location-habits`     | Location d'Habits Traditionnels   | `annale_officielle` | 2023 (Principale) | Ministère de l'Éducation — Tunisie    | `valide_pedagogiquement` |
| `exam-bac2025-droits-acces`        | Droits d'Accès aux Documents      | `annale_officielle` | 2025 (Spécimen)   | Inspection Générale de l'Informatique | `valide_pedagogiquement` |
| `exam-bac2026-bijoux-aurythia`     | Bijoux Aurythia                   | `annale_adaptee`    | 2026 (08h30)      | Examen Blanc — Conception Pédagogique | `valide_pedagogiquement` |
| `exam-bac2026-croisieres-marivana` | Croisières Marivana Voyages       | `annale_adaptee`    | 2026 (12h30)      | Examen Blanc — Conception Pédagogique | `valide_pedagogiquement` |
