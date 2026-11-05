# Baccalauréat STI 2022 — Session de Contrôle

**Épreuve :** Bases de Données (Épreuve Écrite Théorique)  
**Section :** Sciences de l'Informatique  
**Durée :** 2 heures | **Coefficient :** 1.5 | **Barème total :** 20 points

---

## Exercice N°1 : QCM & Notions Théoriques BDD (3 points)

Pour chaque question, cochez l'unique bonne réponse parmi les propositions fournies :

1. **Clause des fonctions d'agrégation** : Dans quelle clause SQL les fonctions d'agrégation (`COUNT`, `SUM`, `AVG`, `MAX`, `MIN`) sont-elles principalement employées ?
2. **Contrainte d'intégrité de domaine** : Quelle clause permet d'imposer une contrainte conditionnelle de domaine sur une colonne ?
3. **Rôle de la clé étrangère** : Quel est le rôle principal d'une clé étrangère dans un schéma relationnel ?
4. **Règle d'intégrité référentielle** : Que garantit la règle d'intégrité référentielle pour toute valeur de clé étrangère ?

---

## Exercice N°2 : Base « GestionConcours » — DDL & Contraintes (4 points)

Soit le schéma relationnel de gestion des candidats à un concours :

- `Candidat` (**#NumCandidat**, Nom, Prenom)
- `Epreuve` (**#CodeEpreuve**, Libelle, Coefficient)
- `Evaluation` (**#NumCandidat**, **#CodeEpreuve**, Note)

Rédigez les commandes SQL LDD :

1. Création de la table `Epreuve` (avec clé primaire `CodeEpreuve`, `Libelle` et `Coefficient` obligatoires).
2. Ajout de la contrainte de clé étrangère sur `CodeEpreuve` dans la table `Evaluation`.
3. Ajout de la contrainte `CHECK` vérifiant que la `Note` est comprise entre 0 et 20.
4. Ajout de la colonne `Genre` de type `CHAR(1)` dans la table `Candidat`.

---

## Exercice N°3 : Base « Gaming » — DDL & DML (6 points)

Soit le schéma de la base Gaming :

- `Categorie` (**#CodeCat**, LibCat)
- `Jeu` (**#CodeJeu**, LibJeu, NatJeu, AgeMin, #CodeCat)

Travail demandé :

1. Rédigez l'instruction LDD pour ajouter la colonne `Version` de type `VARCHAR(10)` à la table `Jeu`.
2. Insérez la nouvelle catégorie suivante dans `Categorie` : `('CAT3', 'Stratégie')`.
3. Insérez le jeu suivant dans la table `Jeu` : `('J010', 'Chess Master', 'P', 8, 'CAT1')`.
4. Écrivez la requête affichant le `CodeJeu`, le `LibJeu` et le `LibCat` de tous les jeux, triés par libellé croissant.

---

## Exercice N°4 : Base « GestionEmployes » — Requêtes SQL (7 points)

Soit le schéma relationnel suivant :

- `Service` (**#NumService**, LibService)
- `Grade` (**#CodeGrade**, LibGrade)
- `Employe` (**#MatEmp**, NomEmp, DateRecrut, #NumService, #CodeGrade)
- `Prime` (**#AnneePrime**, **#MatEmp**, MontPrime)

Rédigez les requêtes SQL correspondantes :

1. Afficher le nombre total d'employés affectés au service `Sécurité` (alias `NbEmployes`).
2. Calculer la moyenne des montants de primes versées durant l'année 2021 (alias `MoyennePrimes`).
3. Afficher le matricule de chaque employé et le montant total des primes perçues (alias `TotalPrimes`).
4. Afficher le matricule, le nom et la date de recrutement des employés recrutés en 2021, triés par date décroissante.
5. Augmenter la prime de 2022 de l'employé `E01` en fixant son nouveau montant à `660.000`.
6. Supprimer toutes les primes attribuées avant l'année 2015.
