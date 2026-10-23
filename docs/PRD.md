# PRD – Plateforme d'Entraînement Web (Bac STI)

|                                 |                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| **Produit**                     | Plateforme d'entraînement en ligne – Bac STI (HTML/CSS, JavaScript, PHP, SQL)             |
| **Version**                     | 3.1 (brouillon)                                                                           |
| **Date**                        | 18 octobre 2026                                                                           |
| **Stack (hypothèse de départ)** | TanStack Start / Next.js + Supabase + Monaco Editor + exécution en bac à sable navigateur |
| **Public cible**                | Élèves de Bac STI et enseignants                                                          |

## Historique

| Version | Changement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Labo Docker (code-server, Apache/PHP, MariaDB, phpMyAdmin)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2.0     | Plateforme web Vercel + Supabase, interface type VS Code                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 3.0     | Correction automatique, aides, mode examen, progression, outils enseignant, MVP phasé                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **3.1** | Intègre deux revues critiques : critères d'acceptation **séparés par phase**, Phase 0 transformée en **jalon de décision** avec protocole et seuils, **versionnage des sujets** et **snapshots** de rendus, **modèle de menace** avec tests négatifs, correction formative / de référence / décision pédagogique, ressources multimédias, **tampon local** de sauvegarde, onboarding, **contrôle de dialecte SQL**, guide de rédaction des critères, MVP recentré sur un parcours complet HTML/CSS/JS, plan B estimé, questions ouvertes triées, licences et contenus |

---

## 1. Résumé

La plateforme est une **application web d'entraînement au Bac STI** qui associe un **environnement de développement type VS Code dans le navigateur** et une **couche pédagogique** : exercices corrigés automatiquement, indices, parcours de compétences, examens blancs et suivi enseignant.

Principe : l'élève sait immédiatement **ce qui est juste, ce qui manque et quoi retravailler** ; l'enseignant gagne du temps de correction et repère les élèves en difficulté.

**Hypothèse d'architecture** : tout s'exécute dans le navigateur (HTML/CSS/JS, PHP en WebAssembly, SQL en moteur local), Vercel héberge l'application, Supabase gère comptes, données et fichiers. Cette hypothèse reste **à démontrer en Phase 0** ; un plan B est défini (§8.3).

## 2. Problèmes adressés

| Problème                                          | Conséquence                               | Réponse de la plateforme                      |
| ------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| Installation d'outils différente selon les postes | Temps perdu, environnements non homogènes | 100 % navigateur, interface identique partout |
| Pas de retour immédiat sur le travail             | L'élève ne sait pas s'il a juste          | Tests automatiques avec détail des critères   |
| L'élève bloqué abandonne ou attend l'enseignant   | Classe bloquée, frustration               | Indices progressifs, tuteur optionnel         |
| Peu de visibilité sur les lacunes                 | Révisions mal ciblées                     | Compétences, points faibles                   |
| Correction manuelle longue                        | Charge pour l'enseignant                  | Pré-correction automatique + grille           |
| Conditions d'examen difficiles à simuler          | Stress le jour J                          | Mode examen chronométré, format `SW_xxxxx`    |

## 3. Objectifs et indicateurs de succès

Les cibles sont **indicatives** : elles seront confirmées ou ajustées après le pilote.

| Objectif                          | Indicateur                                                              | Cible indicative                                      | Mesure (formule / source)                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Autonomie                         | % d'élèves terminant un TP **sans intervention enseignant**             | ≥ 70 %                                                | Intervention = bouton « J'ai besoin d'aide » ou relevé enseignant ; dénominateur = élèves ayant ouvert le sujet |
| Engagement                        | Séances actives / élève / semaine                                       | ≥ 2                                                   | Séance = ≥ 5 min d'activité ; source : événements applicatifs                                                   |
| Efficacité                        | Progression du taux de critères validés entre 1ʳᵉ et dernière tentative | +25 points                                            | Moyenne par sujet ; élèves non terminés signalés séparément                                                     |
| Gain de temps                     | Temps de correction par rendu                                           | −50 %                                                 | Mesure avant/après sur sujets comparables, déclarée par l'enseignant                                            |
| Fidélité d'exécution              | % de scénarios essentiels conformes à la référence                      | voir §7                                               | Harnais de comparaison Phase 0                                                                                  |
| Performance                       | Chargement éditeur, 1ᵉʳ chargement et rechargement avec cache           | < 4 s (cache chaud) ; 1ᵉʳ chargement mesuré et publié | Poste de référence défini en Phase 0, 75ᵉ percentile                                                            |
| Fiabilité du moteur de correction | Taux de faux négatifs / faux positifs                                   | < 3 % / < 1 %                                         | Jeux de solutions valides et invalides par sujet                                                                |
| Intégrité des données             | Taux de perte ou de conflit de sauvegarde                               | 0 perte ; conflits < 0,5 %                            | Journaux de synchronisation                                                                                     |
| Sécurité                          | Taux de réussite des tests négatifs                                     | 100 %                                                 | Suite automatisée (§12)                                                                                         |
| Disponibilité                     | Pendant les créneaux de cours                                           | ≥ 99 %                                                | Fenêtre : heures de classe ; exclusions : maintenance annoncée                                                  |
| Satisfaction                      | Note moyenne élèves / enseignants (séparées)                            | ≥ 4/5                                                 | Questionnaire de fin de pilote, taux de réponse publié                                                          |

### Hors périmètre (pour l'instant)

- Édition collaborative en temps réel entre élèves
- Langages autres que HTML/CSS/JS/PHP/SQL
- Application mobile native
- Notation à valeur officielle d'examen : la plateforme **entraîne**, elle ne certifie pas

## 4. Utilisateurs

| Rôle               | Besoins principaux                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Élève**          | Coder sans installer, savoir s'il a juste, être aidé, suivre sa progression, s'entraîner en conditions d'examen                     |
| **Enseignant**     | Publier des sujets fiables, voir la progression, corriger plus vite, repérer les élèves en difficulté, organiser des examens blancs |
| **Administrateur** | Valider les comptes enseignants, gérer les paramètres et la conformité                                                              |

## 5. Principes directeurs

1. **Valider avant d'élargir** : l'architecture d'exécution est une hypothèse tant que la Phase 0 n'a pas conclu.
2. **Parcours complet avant modules** : on livre un parcours utilisateur de bout en bout plutôt qu'une accumulation de fonctions.
3. **Le résultat observable prime sur le code** : les tests vérifient ce que produit le travail de l'élève, pas la façon de l'écrire.
4. **Aucune donnée de confiance côté client** : corrigés, critères masqués et règles d'examen sont gardés côté serveur.
5. **Ne jamais perdre le travail d'un élève** : sauvegarde locale d'abord, synchronisation ensuite.
6. **L'humain décide** : l'enseignant reste maître de la note, des sanctions et des signalements automatiques.

## 6. Périmètre phasé et critères d'acceptation par phase

> **Règle de décision** : on ne démarre la Phase 1 qu'après un résultat **Go** ou **Go conditionnel** en Phase 0 (§7).

### Phase 0 – Prototype de validation technique (jalon de décision)

Preuve de faisabilité PHP WASM + SQL sur de vrais sujets (§7).
**Critères d'acceptation** : rapport de compatibilité publié, décision Go / Go conditionnel / No-Go, mesures de performance sur poste de référence, estimation chiffrée du plan B.

### Phase 1 – MVP : un parcours élève complet HTML/CSS/JS

- Lot A – Fondations : authentification, rôles, classes et codes d'invitation, **RLS testées**, création et publication **versionnée** de sujets.
- Lot B – Parcours : l'élève rejoint une classe, ouvre un sujet HTML/CSS/JS, édite ses fichiers (dont import d'images), prévisualise, retrouve son travail après reconnexion ; onboarding guidé.
- Lot C – Validation pédagogique minimale : critères **HTML/DOM/CSS simples**, bouton Vérifier, messages clairs, tests de non-régression sur plusieurs solutions valides.
- Espace enseignant de base : classes, publication de sujets, consultation en lecture seule.

### Phase 2 – PHP + SQL

Exécution PHP (WASM), panneau Base de données, couche `mysqli`/PDO, contrôle de dialecte SQL, réinitialisation, export `SW_xxxxx.zip`, import/export `.sql`.

### Phase 3 – Correction automatique étendue et aides

Critères JS, PHP et SQL, indices progressifs, corrigés avec règles de déblocage, historique des tentatives, éditeur de critères.

### Phase 4 – Mode examen et correction assistée

Sessions d'examen, minuteur serveur, verrouillage, reprise, snapshots de rendu, grille de notation, commentaires, export des notes.

### Phase 5 – Progression et pilotage

Compétences et maîtrise, points faibles, statistiques de classe, alertes, badges, détection de similarité, tuteur IA optionnel.

---

## 7. Phase 0 – Protocole de validation technique

### 7.1 Environnement de référence

- PHP 8.2
- Serveur SQL : MariaDB 10.11 (MySQL compatible)
- Extensions : `mysqli`, `pdo_mysql`, sessions, `mbstring`
- Poste bas de gamme : 4 Go RAM, CPU double cœur, navigateur moderne.

### 7.2 Sujets de test

- **S1 – Formulaire PHP + insertion** : `GET`/`POST`, validation, requêtes préparées, redirections.
- **S2 – SQL avancé** : jointures, agrégats, `GROUP BY`/`HAVING`, sous-requêtes, fonctions date, tri.
- **S3 – Application multi-pages** : `include`/`require`, sessions, CRUD, encodage UTF-8.

### 7.3 Harnais de comparaison

Compare HTML produit, colonnes/lignes SQL, état base après exécution, et messages d'erreurs entre l'environnement natif et l'environnement navigateur.

### 7.4 Règle de décision

- **Go** : 100 % scénarios essentiels réussis, ≥ 90 % secondaires, robustesse et perf OK.
- **Go conditionnel** : essentiels OK, écarts documentés et contournables.
- **No-Go** : échec scénario essentiel ou perf inacceptable -> Bascule Plan B (§8.3).

---

## 8. Architecture

### 8.1 Vue d'ensemble (Exécution locale)

- **Frontend** : TanStack Start / React 19 + Monaco Editor + Tailwind CSS + Radix UI.
- **Exécution Client** : Iframe sandbox pour HTML/CSS/JS, Web Worker (PHP WASM) pour PHP, SQLite WASM pour SQL local.
- **Persistance Client** : IndexedDB (tampon local prioritaire) + Service Worker (cache assets & WASM).
- **Backend / Serveur** : Supabase (Postgres, Auth, Storage, Realtime, RLS) + Edge/SSR Functions (TanStack Start / Vercel).

### 8.2 Contrôle de dialecte SQL

SQLite est permissif par rapport à MySQL. Un analyseur de syntaxe/lint SQL avertit l'élève si une requête n'est pas portable sur MySQL/MariaDB (GROUP BY non strict, types, fonctions de date).

### 8.3 Plan B : Architecture hybride

Si No-Go en Phase 0 : conteneurs isolés et éphémères (PHP + MariaDB réels) hors Vercel, avec cycle de vie par session élève.

---

## 9. Exigences fonctionnelles clés (F-01 à F-70)

- **F-01 à F-08** : Comptes, rôles (`eleve`, `enseignant`, `admin` validé par admin), classes, invitations sécurisées.
- **F-09 à F-15** : Interface VS Code-like, Monaco, onboarding, responsive ≥ 1024px.
- **F-16 à F-20** : Dossier normalisé `Travail_Eleve/SW_<numéro>`, upload images/ressources, tampon local.
- **F-21 à F-24** : Prévisualisation iframe isolée, pas de réseau sortant, limites CPU/mémoire/durée.
- **F-25 à F-31** : Panneau DB, initialisation `.sql`, réinitialisation propre.
- **F-32 à F-37** : Catalogue de sujets, publication versionnée immuable (`sujet_versions`).
- **F-38 à F-45** : Moteur de vérification automatique, score, désactivation de critère contesté et recalcul.
- **F-46 à F-48** : 3 niveaux d'indices progressifs, déblocage contrôlé côté serveur.
- **F-49 à F-56** : Sessions d'examen, horloge serveur, verrouillage à l'échéance, snapshots immuables.
- **F-57 à F-60** : Progression, référentiel compétences, points faibles.
- **F-61 à F-70** : Dashboard enseignant, correction assistée, export notes.

---

## 10. Moteur de correction automatique

Trois niveaux de correction :

1. **Formative** : Feedback instantané dans le navigateur de l'élève (indicative).
2. **De référence** : Résultat reproductible rejoué avec moteur et critères versionnés sur le snapshot.
3. **Décision pédagogique** : Note et ajustements finaux par l'enseignant (seule valeur officielle).

---

## 11. Modèle de données (Supabase Postgres)

26 tables normalisées :
`profiles`, `classes`, `class_invitations`, `class_members`, `competences`, `sujets`, `sujet_versions`, `sujet_version_fichiers`, `sujet_version_bases`, `criteres`, `critere_competences`, `indices`, `class_sujets`, `projets`, `projet_fichiers`, `projet_bases`, `tentatives`, `snapshots`, `indices_vus`, `contestations`, `maitrise`, `sessions_examen`, `passages_examen`, `notes`, `commentaires`, `badges`, `journal_securite`.

---

## 12. Modèle de menace & Tests négatifs obligatoires (T-01 à T-14)

- **T-01** : Élève A isolé d'Élève B (fichiers, tentatives, projets).
- **T-02** : Isolation inter-enseignants.
- **T-03** : Auto-attribution de rôle interdite (RLS / trigger).
- **T-04** : Corrigés & critères masqués inaccessibles avant déblocage.
- **T-05** : Invitations invalides/expirées bloquées avec rate-limit.
- **T-06** : Refus d'écriture serveur après échéance examen.
- **T-07** : Transitions d'états d'examen invalides bloquées.
- **T-08** : Snapshots immuables.
- **T-09** : Versions publiées immuables.
- **T-10** : Boucle infinie / dépassement mémoire stoppés proprement.
- **T-11** : Blocage accès réseau et cookies applicatifs depuis code élève.
- **T-12** : Aucune fuite de clé secrète (service_role) dans le client.
- **T-13** : Pas de PII ou code élève dans les logs de télémétrie.
- **T-14** : Anonymisation/suppression RGPD complète sur demande.

---

## 13. Sauvegarde et Tampon Local

- Écriture locale d'abord dans **IndexedDB**.
- Synchronisation en tâche de fond avec numéro de révision (`rev`).
- Résolution explicite des conflits (jamais d'écrasement silencieux).
- Tolérance de reprise en examen avec marquage « synchronisation tardive ».

---

## 14 à 22. Déploiement, Contenu, Risques, Roadmap & Glossaire

- **Licences** : MIT (code) + CC BY-SA 4.0 (contenus). Audit des licences WASM obligatoire.
- **Feuille de route** : M0 (Phase 0) à M8 (v1.0 complète).
- **Glossaire** : Scénario essentiel, Snapshot, Version de sujet, Correction formative / de référence, Tampon local, Contrôle de dialecte.
