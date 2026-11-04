# Épreuve Pratique du Baccalauréat STI 2022

## Sujet : Agence de Voyage AgVoy & Gestion des Coordonnées Élèves (Session Principale)

**Durée :** 1 heure 30 minutes (90 minutes)  
**Coefficient :** 1.5  
**Note Maximale :** 20 points (Mode Examen Blanc)

---

## Contexte et Présentation

L'agence de voyage **AgVoy** souhaite informatiser ses services de réservation d'excursions touristiques et la gestion des données de ses adhérents. L'application repose sur une base de données relationnelle locale nommée `bd_agvoy2022` comprenant six tables :

1. **`Ville`** (`NumVille`, `LibVille`)
2. **`Site`** (`NumSite`, `LibSite`, `#NumVille`)
3. **`Participant`** (`IdParticipant`, `NomPrenom`)
4. **`Excursion`** (`NumEx`, `DateEx`, `PrixEx`, `#NumSite`) avec `PrixEx > 0`
5. **`Participer`** (`#IdParticipant`, `#NumEx`)
6. **`Eleve`** (`Cin`, `Nom`, `Prenom`, `Tel`)

L'arborescence de travail est remise à l'élève sous la forme : `Travail_Eleve/SW_<NCIN>/`.

---

## Travail Demandé

### 1. Base de Données & Structure SQL (3 points)

Le fichier `db/init.sql` initialise la structure relationnelle avec clés primaires, clés étrangères et contraintes d'intégrité :

- Table `Eleve` pour la gestion des coordonnées des élèves inscrits aux excursions.
- Tables `Ville`, `Site`, `Participant`, `Excursion` et `Participer` modélisant l'activité de l'agence AgVoy.

### 2. Interface Web & Feuilles de Styles CSS3 (5 points)

Dans le fichier `modifier.html` :

- Créer un formulaire `form` avec la méthode `POST`, ciblant `modifier.php`, et déclenchant la fonction de contrôle lors de la soumission : `onsubmit="return verif();"`.
- Intégrer les champs de saisie suivants :
  - `cin` : Numéro CIN de l'élève (longueur 8 chiffres).
  - `nom` : Nouveau nom de l'élève.
  - `prenom` : Nouveau prénom de l'élève.
  - `tel` : Nouveau numéro de téléphone (8 chiffres).
  - Un bouton de validation (`type="submit"`) et un bouton de remise à zéro (`type="reset"`).
- Lier la feuille de style externe `mesStyles.css` pour mettre en page le formulaire (`fieldset`, `legend`, `table` ou alignements).

### 3. Contrôles Côté Client en JavaScript (5 points)

Dans le fichier `controles.js`, programmer la fonction `verif()` :

- Vérifier que le champ **CIN** comporte exactement 8 chiffres (`cin.length === 8` et non composé de caractères alphabétiques).
- Vérifier que le **Nom** et le **Prénom** ne sont pas vides.
- Vérifier que le champ **Téléphone** comporte exactement 8 chiffres.
- En cas d'erreur sur l'un des critères, afficher un message explicite via `alert(...)` et **bloquer l'envoi du formulaire** avec `return false;`.
- Si tous les champs sont valides, renvoyer `return true;`.

### 4. Traitement Côté Serveur en PHP & MySQLi (7 points)

Dans le fichier `modifier.php` :

- Établir la connexion au serveur MySQL (`localhost`, `root`, ``, `bd_agvoy2022`).
- Récupérer les paramètres transmis par la méthode `POST` (`cin`, `nom`, `prenom`, `tel`).
- Vérifier l'existence de l'élève dans la table `Eleve` (`SELECT * FROM Eleve WHERE Cin = '$cin'`).
  - Si l'élève n'existe pas, afficher un message d'erreur : _"Élève introuvable dans la base"_.
  - Si l'élève existe, exécuter la requête de mise à jour :
    ```sql
    UPDATE Eleve SET Nom = '$nom', Prenom = '$prenom', Tel = '$tel' WHERE Cin = '$cin'
    ```
    et afficher un message de confirmation attestant de la modification avec succès.
