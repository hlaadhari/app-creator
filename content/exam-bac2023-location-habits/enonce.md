# Épreuve Pratique du Baccalauréat STI 2023

## Sujet : Gestion de la Location d'Habits Traditionnels

**Durée :** 1 heure 30 minutes (90 minutes)  
**Coefficient :** 1.5  
**Note Maximale :** 20 points (Mode Examen)

---

## Contexte et Présentation

Une maison de haute couture et de confection artisanale met en place une application web locale pour informatiser la gestion de location de ses habits traditionnels de cérémonie (Jebba, Caftan, Keswa...).

Pour assurer ce service, l'application s'appuie sur une base de données relationnelle nommée `bd2023`, composée des trois tables suivantes :

1. **`client`** : `cin` (clé primaire, 8 chiffres), `nom` (chaîne max 30 car.), `prenom` (chaîne max 30 car.), `tel` (chaîne de 8 chiffres).
2. **`habit`** : `id_habit` (clé primaire, entier auto-incrémenté), `description` (chaîne max 100 car.), `taille` (S, M, L, XL), `prix_jour` (décimal > 0), `disponible` ('O' ou 'N', défaut 'O').
3. **`location`** : `id_loc` (clé primaire auto-incrémentée), `cin` (clé étrangère référant à `client`), `id_habit` (clé étrangère référant à `habit`), `date_loc` (date de début de location), `duree` (nombre de jours entier strictement positif).

---

## Travail Demandé

L'arborescence de travail remise à l'élève doit respecter impérativement le nommage : `SW_<NCIN>/` (où `<NCIN>` est le numéro de carte d'identité nationale de l'élève).

### 1. Formulaire HTML & Feuilles de Styles (4 points)

- Créer la page Web `location.html` contenant un formulaire permettant de saisir :
  - Le numéro de CIN du client (`id="cin"`, `name="cin"`).
  - La sélection de l'habit souhaité (`id="id_habit"`, `name="id_habit"`).
  - La date de location (`id="date_loc"`, `name="date_loc"`).
  - La durée de location en jours (`id="duree"`, `name="duree"`).
  - Un bouton d'envoi (`type="submit"`) et un bouton de réinitialisation (`type="reset"`).
- Associer la feuille de styles CSS `mesStyles.css` pour mettre en valeur les éléments (`body`, `fieldset`, `legend`, `table` ou alignements CSS, et boutons).

### 2. Validation Côté Client en JavaScript (5 points)

Dans le fichier `controls.js`, programmer la fonction `verif2()` qui est exécutée lors de la soumission du formulaire (`onsubmit="return verif2()"`), assurant les contrôles stricts suivants :

- Le champ CIN doit comporter **exactement 8 chiffres** (non vide, numérique entier).
- L'habit doit obligatoirement être sélectionné (sélection distincte de l'option par défaut).
- La date de location doit être renseignée.
- La durée doit être un entier **strictement supérieur à zéro** (≥ 1).
- Si l'un des contrôles échoue, une boîte de dialogue explicite s'affiche (`alert(...)`) et la soumission est annulée (`return false`).

### 3. Traitement Côté Serveur en PHP (11 points)

Dans le script `location.php` :

- Établir la connexion avec le serveur MySQL/MariaDB (`localhost`, `root`, ``, `bd2023`). En cas d'échec, interrompre l'exécution avec un message explicite.
- Récupérer les données transmises par la méthode `POST`.
- Vérifier si le client existe dans la table `client`. Si le client n'existe pas, afficher un message d'erreur invitant à l'enregistrement préalable.
- Vérifier la disponibilité de l'habit sélectionné dans la table `habit` (`disponible = 'O'`). Si l'habit est déjà loué (`disponible = 'N'`), avertir l'utilisateur.
- Si le client existe et que l'habit est disponible :
  1. Insérer un nouvel enregistrement dans la table `location`.
  2. Mettre à jour l'habit en passant son statut à indisponible (`UPDATE habit SET disponible = 'N' WHERE id_habit = ...`).
  3. Afficher un message de confirmation récapitulant les détails de la location et le montant estimé (`prix_jour * duree`).

---

## Barème Officiel de Notation (sur 20 points)

| Partie         | Critère Évalué                                                       | Points     |
| -------------- | -------------------------------------------------------------------- | ---------- |
| **Front-End**  | Formulaire HTML5 sémantique (`location.html`)                        | 2 pts      |
| **Front-End**  | Intégration et mise en page CSS3 (`mesStyles.css`)                   | 2 pts      |
| **JavaScript** | Contrôle du CIN et de la sélection de l'habit                        | 2.5 pts    |
| **JavaScript** | Contrôle de la date et de la durée dans `verif2()`                   | 2.5 pts    |
| **PHP & SQL**  | Connexion MySQLi et réception des paramètres POST                    | 4 pts      |
| **PHP & SQL**  | Vérification client/disponibilité et requête `INSERT INTO location`  | 4 pts      |
| **PHP & SQL**  | Requête `UPDATE habit SET disponible='N'` et affichage récapitulatif | 3 pts      |
| **Total**      | **Note Globale Bac Pratique**                                        | **20 pts** |
