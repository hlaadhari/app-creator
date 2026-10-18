# Épreuve Pratique du Baccalauréat STI 2018

## Sujet : Système d'Évaluation et d'Essai Automobile (Test Drive)

**Durée :** 1 heure 30 minutes (90 minutes)  
**Coefficient :** 1.5  
**Note Maximale :** 20 points (Mode Examen)

---

## Contexte et Présentation

Un concessionnaire automobile propose à ses clients potentiels d'essayer des voitures neuves avant tout achat. À l'issue de chaque essai (Test Drive), le client remplit une fiche d'évaluation pour noter les performances du véhicule selon plusieurs critères : le confort, la conduite et la sécurité.

Pour informatiser ce processus, une base de données relationnelle est mise en œuvre avec trois tables :

1. **`voiture`** : `immatriculation` (clé primaire, chaîne max 20 car.), `marque` (chaîne max 30 car.), `modele` (chaîne max 30 car.), `energie` (Essence, Diesel, Hybride, Électrique), `disponible` ('O' ou 'N', défaut 'O').
2. **`client`** : `cin` (clé primaire, 8 chiffres), `nom` (chaîne max 30 car.), `prenom` (chaîne max 30 car.), `permis` (numéro de permis de conduire).
3. **`evaluation`** : `id_eval` (clé primaire auto-incrémentée), `cin` (clé étrangère référant à `client`), `immatriculation` (clé étrangère référant à `voiture`), `date_test` (date de l'essai), `note_confort` (entier compris entre 1 et 5), `note_conduite` (entier compris entre 1 et 5), `note_securite` (entier compris entre 1 et 5), `commentaire` (texte libre facultatif).

---

## Travail Demandé

L'arborescence de travail doit respecter le dossier normalisé : `SW_<NCIN>/`.

### 1. Formulaire HTML & Mise en Page CSS (4 points)

- Créer la page Web `evaluation.html` contenant :
  - Le champ CIN du client (`id="cin"`, `name="cin"`, max 8 caractères).
  - La sélection du véhicule essayé (`id="immatriculation"`, `name="immatriculation"`).
  - La date de l'essai (`id="date_test"`, `name="date_test"`).
  - Trois champs numériques pour les notes :
    - Confort (`id="note_confort"`, `name="note_confort"`, min: 1, max: 5).
    - Conduite (`id="note_conduite"`, `name="note_conduite"`, min: 1, max: 5).
    - Sécurité (`id="note_securite"`, `name="note_securite"`, min: 1, max: 5).
  - Une zone de texte pour un commentaire éventuel (`id="commentaire"`, `name="commentaire"`).
  - Un bouton d'envoi vers `evaluer.php` (`type="submit"`) et un bouton de réinitialisation (`type="reset"`).
- Créer et lier la feuille de styles CSS `mesStyles.css` pour assurer une présentation claire (mise en tableau ou alignement soigné, couleurs contrastées, boutons stylisés).

### 2. Contrôle Côté Client en JavaScript (5 points)

Dans le fichier `controle.js`, implémenter la fonction `test()` appelée lors de la soumission du formulaire (`onsubmit="return test();"`) :

- Vérifier que le champ CIN comporte **exactement 8 chiffres**.
- Vérifier qu'un véhicule a été sélectionné dans la liste déroulante.
- Vérifier que la date de l'essai est renseignée.
- Vérifier que chaque note (confort, conduite, sécurité) est un nombre entier **compris entre 1 et 5 inclus**.
- En cas d'erreur de saisie, afficher un message d'alerte (`alert(...)`) et annuler l'envoi (`return false`).

### 3. Traitement Serveur & Agrégation en PHP (11 points)

Dans le script `evaluer.php` :

- Établir la connexion à la base de données MySQLi (`localhost`, `root`, ``, base de test).
- Récupérer et valider les paramètres transmis par `POST`.
- Vérifier que le client (`cin`) et la voiture (`immatriculation`) existent dans la base.
- Insérer l'évaluation dans la table `evaluation`.
- Calculer la moyenne générale attribuée lors de ce test : `(note_confort + note_conduite + note_securite) / 3`.
- Exécuter une requête SQL d'agrégation (`AVG`) pour calculer la moyenne historique de ce modèle de voiture sur l'ensemble des essais passés.
- Afficher un bilan d'évaluation complet avec les moyennes obtenues.

---

## Barème Officiel de Notation (sur 20 points)

| Partie         | Critère Évalué                                                  | Points     |
| -------------- | --------------------------------------------------------------- | ---------- |
| **Front-End**  | Formulaire HTML5 sémantique (`evaluation.html`)                 | 2 pts      |
| **Front-End**  | Feuille de styles et ergonomie (`mesStyles.css`)                | 2 pts      |
| **JavaScript** | Validation du CIN et sélection de voiture                       | 2.5 pts    |
| **JavaScript** | Contrôle des notes multi-critères (1 à 5) et date dans `test()` | 2.5 pts    |
| **PHP & SQL**  | Connexion MySQLi et réception des paramètres POST               | 4 pts      |
| **PHP & SQL**  | Vérifications préalables et insertion dans `evaluation`         | 4 pts      |
| **PHP & SQL**  | Requêtes d'agrégation (`AVG`) et récapitulatif des notes        | 3 pts      |
| **Total**      | **Note Globale Bac Pratique**                                   | **20 pts** |
