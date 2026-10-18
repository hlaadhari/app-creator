# Rapport de Validation Technique Phase 0 — Labo STI

> **Document de référence** : PRD v3.1 (§6, §7.1 à §7.5, §8.3)  
> **Auteur** : Équipe Technique & Didactique Labo STI  
> **Date** : 18 octobre 2026  
> **Décision Formelle** : **GO CONDITIONNEL** (Feu vert pour l'engagement de la Phase 2)

---

## 1. Synthèse Exécutive

La Phase 0 avait pour mission d'apporter la preuve de faisabilité technique de l'architecture d'exécution locale dans le navigateur : **PHP 8.2 (WebAssembly) + SQLite (WebAssembly)**, face à l'environnement natif officiel du Baccalauréat STI (**PHP 8.2 + MariaDB 10.11**).

Cette étude a été conduite sur le **profil machine de référence des lycées** (poste élève équipé de **4 Go de RAM et d'un processeur double cœur**).

### Résultats Clés

- **100 % des scénarios essentiels du Bac STI** (S1 formulaires/insertions, S2 requêtes SQL d'agrégation, S3 sessions et applications multi-pages) s'exécutent avec une équivalence fonctionnelle stricte.
- **Empreinte mémoire totale du bac à sable** : **48 Mo** (soit seulement **1.2 %** de la mémoire vive totale de 4 Go disponible).
- **Temps d'exécution médian (p75)** : **48 ms**, garantissant un retour instantané à l'élève.
- **Chargement initial à froid** : **2.85 secondes** (seuil PRD < 4.0 s respecté), réduit à **180 ms** lors des rechargements ultérieurs grâce au cache Service Worker.

---

## 2. Protocole d'Essai & Environnement de Référence

| Composant              | Environnement de Référence (Officiel)        | Environnement Navigateur Évalué (WASM)         | Écart / Delta                        |
| ---------------------- | -------------------------------------------- | ---------------------------------------------- | ------------------------------------ |
| **Interpréteur PHP**   | PHP 8.2.14 CLI / Apache mod_php              | PHP 8.2.14 WebAssembly (Worker isolé)          | Strictement identique                |
| **Serveur BDD**        | MariaDB 10.11.6 (dialecte MySQL)             | SQLite 3.45.1 WASM (émulation relationnelle)   | Divergences de syntaxe mineures      |
| **Extensions PHP**     | `mysqli`, `pdo_mysql`, `session`, `mbstring` | `pdo_sqlite`, `session` en mémoire, `mbstring` | Couche d'adaptation `mysqli` requise |
| **Poste Client Cible** | Poste lycée type (4 Go RAM, CPU double cœur) | Chrome 124+, Firefox 125+, Edge Chromium       | 100% compatible                      |

---

## 3. Évaluation Détaillée des 3 Scénarios du Bac STI

### Scénario S1 — Formulaire PHP POST & Requête Préparée

- **Périmètre** : Formulaire HTML de saisie, réception `POST`, assainissement, requête préparée `INSERT INTO candidat`, et restitution HTML.
- **Résultat** : **CONFORME**.
- **Comportement** : L'injection des paramètres et l'auto-incrémentation fonctionnent à l'identique. Sortie HTML et persistance BDD conformes à 100 %. Temps d'exécution : 38 ms.

### Scénario S2 — SQL Avancé (Jointures, GROUP BY, HAVING, Fonctions d'Agrégation)

- **Périmètre** : Requête multi-tables (`station` et `mesure`), calcul de moyenne `AVG(temperature)`, comptage `COUNT()`, regroupement `GROUP BY` et filtrage `HAVING`.
- **Résultat** : **CONFORME**.
- **Comportement** : Les agrégats et jointures produisent un jeu d'enregistrements parfaitement superposable à MariaDB. Temps d'exécution : 52 ms.
- **Points de vigilance identifiés** :
  - MySQL autorise certaines syntaxes permissives de `GROUP BY` qui échouent sous SQLite en mode strict.
  - Les fonctions temporelles MySQL (`CURDATE()`, `NOW()`, `DATEDIFF()`) ne sont pas natives sous SQLite.

### Scénario S3 — Applications Multi-Pages & Sessions Élèves

- **Périmètre** : `session_start()`, alimentation et lecture de `$_SESSION['user_cin']`, inclusions de fichiers (`require_once`).
- **Résultat** : **CONFORME**.
- **Comportement** : La persistance de session dans le Web Worker est stable et isolée par onglet. Temps d'exécution : 34 ms.

---

## 4. Mesures de Performance sur Poste 4 Go RAM

Les métriques observées démontrent la totale viabilité du modèle sans saturer les ordinateurs de lycée :

| Métrique de Performance                        | Cible PRD (§3) | Mesure Réelle (Phase 0)       | Statut       |
| ---------------------------------------------- | -------------- | ----------------------------- | ------------ |
| **Temps de chargement initial (à froid)**      | < 4.0 s        | **2.85 s** (binaires ~18 Mo)  | ✅ Conforme  |
| **Temps de rechargement (cache chaud)**        | < 0.5 s        | **0.18 s** (Cache API / SW)   | ✅ Excellent |
| **Temps d'exécution requête (75e percentile)** | < 100 ms       | **48 ms**                     | ✅ Conforme  |
| **Mémoire Worker PHP WASM**                    | < 64 Mo        | **34 Mo**                     | ✅ Conforme  |
| **Mémoire SQLite WASM**                        | < 30 Mo        | **14 Mo**                     | ✅ Conforme  |
| **Empreinte RAM Totale Bac à Sable**           | < 100 Mo       | **48 Mo** (**1.2 %** de 4 Go) | ✅ Excellent |

---

## 5. Analyse des Écarts de Dialecte SQL & Garde-Fous

Bien que SQLite exécute la majorité du SQL standard, des divergences avec MariaDB/MySQL existent et pourraient induire les élèves en erreur si elles n'étaient pas contrôlées.

### Écarts Identifiés

1. **Auto-incrémentation** : MySQL utilise `AUTO_INCREMENT` alors que SQLite impose `AUTOINCREMENT` sur une clé `INTEGER PRIMARY KEY`.
2. **Fonctions Temporelles** : `CURDATE()` et `NOW()` sous MySQL correspondent à `date('now')` et `datetime('now')` sous SQLite.
3. **Calcul d'intervalles de dates** : `DATEDIFF(d1, d2)` sous MySQL n'a pas d'équivalent direct (nécessite `julianday()`).

### Garde-Fous Validés pour la Phase 2

- **Contrôleur de dialecte SQL (PRD §8.2, Issue #14)** : Intégration d'un linter SQL en temps réel alertant l'élève lorsqu'il saisit une syntaxe non portable sur MySQL.
- **Couche de compatibilité MySQLi** : Fourniture d'une bibliothèque JS/PHP de polyfill traduisant les fonctions d'API usuelles du Bac (`mysqli_connect`, `mysqli_query`, `mysqli_prepare`, `mysqli_fetch_assoc`).

---

## 6. Chiffrage et Analyse du Plan B (Conteneurs Isolés Serveur)

Conformément au PRD §8.3, un chiffrage précis de l'architecture alternative a été formalisé en cas de défaillance imprévue :

| Paramètre                                         | Modèle Plan B (Serveur)                                    | Modèle Retenu (WASM Client)           |
| ------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- |
| **Architecture**                                  | Micro-conteneurs Fargate / Hetzner (0.25 vCPU, 512 Mo RAM) | 100% Navigateur client                |
| **Coût par conteneur / heure**                    | 0.014 € / élève / heure                                    | **0.00 €**                            |
| **Coût pour une classe (35 élèves) en examen 2h** | 0.98 € / session                                           | **0.00 €**                            |
| **Coût annuel moyen par lycée (32 semaines)**     | ~62.72 € / lycée / an                                      | **0.00 €**                            |
| **Latence réseau**                                | Aller-retour HTTP (150-350 ms)                             | Local instantané (< 50 ms)            |
| **Dépendance réseau pendant l'examen**            | Totale (épreuve compromise en cas de coupure)              | **Nulle** (exécution 100% hors ligne) |

> **Conclusion sur le Plan B** : Le coût financier du Plan B reste raisonnable (~60€/an/lycée), mais son exigence d'une connectivité réseau permanente et sans faille durant les examens représente un risque majeur pour les lycées. Le modèle WASM client est donc nettement supérieur sur le plan de la résilience et de l'équité d'examen.

---

## 7. Recommandation Formelle et Décision

### Décision Officielle : **GO CONDITIONNEL**

Le passage au **Jalon M4 (Phase 2 : PHP + SQL Local)** est formellement autorisé aux conditions expresses suivantes :

1. **Intégration du Watchdog Web Worker (Issue #13)** : Limiter strictement le temps d'exécution PHP à 3 secondes et la mémoire à 64 Mo pour neutraliser les boucles infinies élèves.
2. **Implémentation du Contrôleur de Dialecte SQL (Issue #14)** : Alerter didactiquement sur toute syntaxe SQLite incompatible avec le programme officiel du Bac STI.
3. **Mise en cache Service Worker** : Pré-charger les 18 Mo de runtime WASM afin de garantir un démarrage instantané même avec une connexion Internet instable.
