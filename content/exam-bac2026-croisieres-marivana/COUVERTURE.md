# Matrice de Couverture Pédagogique — Bac 2026 Croisières Marivana (`exam-bac2026-croisieres-marivana`)

## 1. Synthèse Pédagogique

- **Sujet** : `exam-bac2026-croisieres-marivana`
- **Titre** : Bac 2026 - Croisières Marivana (Session de 11h00)
- **Module** : Module C — Épreuves Pratiques Officielles du Baccalauréat
- **Référentiel** : `bac-si-tn` (Baccalauréat Sciences de l'Informatique — Épreuve Pratique STI)
- **Session source** : Baccalauréat 2026 (Épreuve blanche calibrée - 11h00)
- **Barème total** : 20 points
- **Nombre de critères** : 12 critères

---

## 2. Matrice Consignes ➔ Critères ➔ Sondes de Test

| N°  | Consigne de l'Énoncé                                                                          | Fichier Ciblé      | Id Critère | Sonde / Type de Vérification                                          |  Points  |
| :-: | :-------------------------------------------------------------------------------------------- | :----------------- | :--------- | :-------------------------------------------------------------------- | :------: |
|  1  | Concevoir la BDD, créer la table `reservation` avec clé primaire composée et relations        | `index.html`       | `EX26C-01` | Correction Enseignant: intégrité des tables et clés étrangères        |  1.5 pt  |
|  2  | Structurer `index.html` avec en-tête, image navire.png, menu à 3 liens et section photo       | `index.html`       | `EX26C-02` | DOM Probe: header span, image, nav avec 3 liens, section              |  1.5 pt  |
|  3  | Mettre en forme l'en-tête (marges, police 60px, arrondi 50%, opacité 0.5)                     | `index.html`       | `EX26C-03` | CSS Computed: header img opacity 0.5, disposition                     |  1.5 pt  |
|  4  | Créer `photo.html` avec figure, figcaption et pied de page d'informations                     | `photo.html`       | `EX26C-04` | DOM Probe: figure figcaption et footer contacts                       |  0.5 pt  |
|  5  | Styliser le survol des photos (zoom x2, transition 3s) et centrer le pied de page             | `photo.html`       | `EX26C-05` | CSS Computed: footer text-align center, animation survol              |   1 pt   |
|  6  | Créer `croisiere.html` avec sélection de destinations et options à cocher                     | `croisiere.html`   | `EX26C-06` | DOM Probe: form, destinations 1/2/3, checkbox, verif1                 | 1.25 pt  |
|  7  | Contrôler dans `verif1()` la destination obligatoire et la cohérence temporelle des dates     | `croisiere.html`   | `EX26C-07` | JS Test Case: verif1 (Date 1 > aujourd'hui, Date 2 > Date 1)          |  1.5 pt  |
|  8  | Configurer `connexion.php` avec les identifiants MySQLi et le nom de la base                  | `index.html`       | `EX26C-08` | Correction Enseignant: mysqli_connect et sélection de la base         |  0.5 pt  |
|  9  | Dans `croisiere.php`, filtrer les croisières, trier par date et afficher les colonnes voulues | `index.html`       | `EX26C-09` | Correction Enseignant: filtres période/destination et colonnes        | 2.5 pts  |
| 10  | Créer `reservation.html` avec identifiant, nom, tél, croisière et sélecteur de places         | `reservation.html` | `EX26C-10` | DOM Probe: form reservation, input tel, select, output nb             |  2 pts   |
| 11  | Implémenter `nombres()` (affichage x/10) et `verif2()` (contrôle CIN / Passeport et nom)      | `reservation.html` | `EX26C-11` | JS Test Case: nombres (format n/10) et verif2 (CIN / Passeport / nom) | 2.25 pts |
| 12  | Dans `reservation.php`, normaliser le nom, vérifier doublons et valider la réservation        | `index.html`       | `EX26C-12` | Correction Enseignant: doublon, client, insertion avec date/heure     |  4 pts   |

---

## 3. Banc Didactique Tripartite

- **`solution/`** : Implémentation officielle complète conforme aux critères et barème (20/20 pts).
- **`solution-alt/`** : Implémentation alternative utilisant des fonctions modulaires et requêtes sécurisées (20/20 pts).
- **`solution-invalide/`** : Implémentation comportant des anomalies de validation et de clés de formulaires.
