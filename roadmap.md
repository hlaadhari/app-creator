# Feuille de Route & Avancement — Labo STI (Bac STI)

> **Source officielle** : PRD v3.1 (§6, §7, §22)  
> **Dernière mise à jour** : 18 octobre 2026

---

## Synthèse Globale des Jalons (M0 à M8)

| Jalon | Étape & Périmètre | Livrable Clé | Condition de Sortie / Seuil | Statut |
|---|---|---|---|---|
| **M0** | **Phase 0 : Validation Technique** | Rapport de faisabilité + banc de test | Décision Go / Go conditionnel / No-Go (§7.5) | **Validé (Go conditionnel)** |
| **M1** | **Phase 1 : Fondations & Base** | Schéma Supabase, Auth, RLS, CI | Démarrage en environnement vierge, RLS testées | **Partiellement réalisé** |
| **M2** | **Phase 1 : MVP Parcours Élève** | Parcours complet HTML/CSS/JS | Critères d'acceptation Phase 1 validés | **En cours** |
| **M3** | **Pilote Court HTML/CSS/JS** | Retour terrain sur 1 classe (4-6 sem.) | 0 perte de données, satisfaction ≥ 4/5 | Planifié |
| **M4** | **Phase 2 : PHP & SQL Local** | Exécution WASM, panneau SQL, dialecte | Scénarios essentiels du Bac conformes | **Validé** |
| **M5** | **Phase 3 : Correction Étendue & Aides** | Indices 3 niveaux, corrigés, contestations | Faux négatifs < 3%, faux positifs < 1% | Planifié |
| **M6** | **Phase 4 : Mode Examen & Snapshots** | Sessions synchronisées, grille notation | Écritures refusées après temps serveur, snapshots scellés | **Validé** |
| **M7** | **Phase 5 : Pilotage & Compétences** | Référentiel, points faibles, tuteur IA | Formule de maîtrise testée, tuteur coupé en examen | Planifié |
| **M8** | **Version 1.0 & Déploiement** | Déploiement étendu lycée | KPIs globaux au vert (§3) | Planifié |

---

## Détail des Étapes et Critères d'Acceptation

### Jalon M0 — Phase 0 : Validation Technique (Jalon de Décision)
- [x] Spécification du protocole de test sur poste de référence (4 Go RAM, CPU double cœur).
- [x] Définition des 3 sujets représentatifs (S1 : Formulaire PHP POST, S2 : SQL avancé, S3 : Multi-pages & sessions).
- [x] [Issue #12](https://github.com/hlaadhari/app-creator/issues/12) : Conception du harnais de comparaison (sortie HTML, état base, codes retours entre MariaDB/PHP natif et WASM).
- [x] Mesure des métriques de performance (temps de chargement, consommation mémoire).
- [x] Chiffrage précis du Plan B (coût par élève/heure sur conteneurs isolés).
- [x] Décision formelle : **Go / Go conditionnel / No-Go** ([docs/PHASE_0_REPORT.md](docs/PHASE_0_REPORT.md) validé avec **GO CONDITIONNEL**).

---

### Jalon M1 — Phase 1 (Lot A) : Fondations & Données
- [x] **Étape 1.1 - Rôles & Profils** : Migration `0000_etape1_profiles_roles.sql` (enum `app_role`, table `profiles`, trigger `handle_new_user`, fonction `has_role`).
- [x] **Étape 1.2 - Sujets & Immuabilité** : Migration `0001_etape2_sujets.sql` (tables `sujets`, `sujet_versions`, `sujet_version_fichiers`, `criteres`, `solutions`, `indices`, triggers `protect_published_version` et `protect_published_children`, seed 3 sujets initiaux).
- [x] **Étape 1.3 - Classes, Invitations & Projets** : Migration `0002_etape3_classes_projets.sql` (tables `classes`, `class_invitations`, `class_members`, `class_sujets`, `projets`, `projet_fichiers`, `tentatives`, RPC `rejoindre_classe` et `initialiser_projet`, RLS complètes).
- [x] **Étape 1.4 - Suite de tests négatifs MVP** : [Issue #9](https://github.com/hlaadhari/app-creator/issues/9) : Automatisation des tests T-01 à T-14 en CI.

---

### Jalon M2 — Phase 1 (Lot B & C) : MVP Parcours Élève HTML/CSS/JS
- [ ] **Étape 2.1 - Authentification & Onboarding** ([Issue #7](https://github.com/hlaadhari/app-creator/issues/7)) :
  - [ ] Écran de connexion / inscription Supabase Auth.
  - [ ] Rejoindre une classe via code d'invitation avec vérification expiration/quota.
  - [ ] Visite guidée (Onboarding) lors de la première connexion.
- [ ] **Étape 2.2 - Espace de Travail & Éditeur Monaco** ([Issue #5](https://github.com/hlaadhari/app-creator/issues/5)) :
  - [ ] Intégration de Monaco Editor en remplacement du textarea actuel.
  - [ ] Arborescence de fichiers normalisée `Travail_Eleve/SW_<numéro>`.
  - [ ] Import de ressources locales (images, polices, CSS) par glisser-déposer et rendu dans l'aperçu.
- [ ] **Étape 2.3 - Résilience & Tampon Local** ([Issue #6](https://github.com/hlaadhari/app-creator/issues/6)) :
  - [ ] Remplacement de `localStorage` par IndexedDB (`labo_sti_buffer`).
  - [ ] Synchronisation avec numéro de révision (`rev`) et détection de conflits.
  - [ ] Indicateur d'état temps réel (Enregistré local / En cours de synchronisation / Synchronisé / Hors ligne).
  - [ ] Reprise sans perte de travail après coupure réseau simulée.
- [ ] **Étape 2.4 - Correction Formative** ([Issue #8](https://github.com/hlaadhari/app-creator/issues/8)) :
  - [ ] Exécution dynamique des sondes JSON stockées en base dans la table `criteres`.
  - [ ] Bouton « Vérifier » renvoyant le détail critère par critère en moins de 3 secondes.
  - [ ] Validation de chaque sujet avec au moins 2 solutions valides différentes et 1 solution invalide.
- [x] **Étape 2.5 - Espace Enseignant de base** ([Issue #10](https://github.com/hlaadhari/app-creator/issues/10) & [Issue #11](https://github.com/hlaadhari/app-creator/issues/11)) :
  - [x] Consultation en lecture seule du travail des élèves de sa classe.
  - [x] Publication de nouvelles versions de sujets (garantie d'immuabilité des projets en cours).

---

### Jalon M4 — Phase 2 : PHP + SQL Local
- [x] [Issue #13](https://github.com/hlaadhari/app-creator/issues/13) : Intégration de PHP WASM dans un Web Worker avec limites de ressources (watchdog 3s, max 64 Mo).
- [x] [Issue #14](https://github.com/hlaadhari/app-creator/issues/14) : Intégration du moteur SQLite WASM et chargement des scripts `.sql` du sujet.
- [x] Panneau « Base de données » (visualiseur de tables, exécution de requêtes interactives).
- [x] Implémentation du **Contrôleur de dialecte SQL** (alerte sur les syntaxes SQLite incompatibles MySQL).
- [x] Bouton de réinitialisation de la base à l'état initial du sujet.
- [x] Export et import de l'archive `SW_xxxxx.zip`.

---

### Jalon M5 — Phase 3 : Correction Étendue & Aides
- [x] [Issue #32](https://github.com/hlaadhari/app-creator/issues/32) : Interface de contestation de critère élève, historique des tentatives et déblocage des corrigés de référence (PR #37).
- [x] Bouton « Contester ce critère » côté élève avec file de traitement enseignant (PRD F-44, F-45).
- [x] Historique chronologique des tentatives avec calcul des deltas de progression (+/- pts) et suivi critère par critère.
- [x] Déblocage tracé des corrigés de référence selon les règles de l'enseignant avec garde-fous anti-triche stricts en mode examen (T-04 / T-06).
- [x] Support des critères multi-langages (tests d'effets de bord PHP et assertions SQL).
- [x] Système d'indices progressifs (3 niveaux) avec déblocage sécurisé par RPC serveur (`debloquer_indice`).
- [x] Possibilité pour l'enseignant de désactiver un critère contesté et de recalculer les notes automatiquement ([Issue #11](https://github.com/hlaadhari/app-creator/issues/11)).

---

### Jalon M6 — Phase 4 : Mode Examen Blanc & Snapshots
- [x] [Issue #15](https://github.com/hlaadhari/app-creator/issues/15) : Sessions d'examen synchronisées avec gestion de la salle d'attente (PR #28).
- [x] Minuteur et calcul du temps sous contrôle strict de l'horloge serveur.
- [x] Verrouillage automatique des écritures à l'échéance serveur.
- [x] [Issue #16](https://github.com/hlaadhari/app-creator/issues/16) : Génération du **Snapshot immuable** du rendu (hash SHA-256, fichiers, base, versions) (PR #29).
- [x] Rejouage reproductible de la correction de référence.
- [x] Grille de notation assistée pour l'enseignant avec journalisation des justifications.
- [x] [Issue #27](https://github.com/hlaadhari/app-creator/issues/27) : Catalogue étendu des sujets (Modules A, B, C) et accès Espace Enseignant / Mode Démo (PR #28).
- [x] [Issue #30](https://github.com/hlaadhari/app-creator/issues/30) : Espace d'administration centrale, validation des enseignants (`valide_par`) et conformité RGPD (PR #31).

---

### Jalon M7 & M8 — Phase 5 & Version 1.0
- [ ] [Issue #33](https://github.com/hlaadhari/app-creator/issues/33) : Référentiel de compétences du Bac STI et matrice de maîtrise.
- [ ] [Issue #34](https://github.com/hlaadhari/app-creator/issues/34) : Tableau de bord statistique de classe et détection des décrochages.
- [ ] [Issue #35](https://github.com/hlaadhari/app-creator/issues/35) : Tuteur IA pédagogique (sans révélation de la solution, coupé en examen).
- [ ] [Issue #36](https://github.com/hlaadhari/app-creator/issues/36) : Détection indicative de similarité entre rendus de classe (anti-plagiat).
- [ ] Audit d'accessibilité (contrastes, navigation clavier) et audit légal des licences de dépendances WASM.
