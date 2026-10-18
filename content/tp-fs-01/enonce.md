# TP de Synthèse Full-Stack : Formulaire de Don pour les Lycées

## Contexte

Afin de moderniser les équipements des laboratoires de sciences et technologies (ateliers robotiques, imprimantes 3D, microcontrôleurs), une association de parents et d'anciens élèves met en place une plateforme de don matériel à destination des établissements scolaires.

Votre travail consiste à réaliser une application web complète (Front-End & Back-End) conforme aux exigences de l'épreuve pratique du Baccalauréat STI.

---

## 1. Structure HTML & Présentation (`Don.html` & `mesStyles.css`)

Dans la page `Don.html` liée à la feuille de style `mesStyles.css` :

- Créez un titre principal `<h1>` : « Soutien aux Laboratoires de Lycée – Formulaire de Don ».
- Insérez un formulaire d'identifiant `fDon` pointant vers `enregistrer.php` avec la méthode `POST`.
- Regroupez les champs dans un `<fieldset>` avec une légende `<legend>` : « Informations sur le Donateur et le Matériel ».
- Les champs obligatoires sont :
  1. **Nom du donateur** : champ texte `id="nom"` (non vide).
  2. **Type de donateur** : boutons radio `name="type_user"` avec les valeurs : « Élève », « Enseignant », « Parent », « Entreprise ».
  3. **Lycée bénéficiaire** : liste déroulante `<select id="lycee">` proposant au moins 3 lycées (ex: Lycée Pilote, Lycée Technique, Lycée Ibn Khaldoun).
  4. **Article matériel** : liste déroulante `<select id="article">` proposant :
     - Ordinateur (Prix unitaire : 800 DT)
     - Imprimante 3D (Prix unitaire : 1200 DT)
     - Casque VR (Prix unitaire : 500 DT)
     - Carte Microcontrôleur (Prix unitaire : 60 DT)
  5. **Quantité** : champ numérique `id="qte"` (entier supérieur à 0).
  6. **Montant total estimé** : champ texte en lecture seule `id="montant"` calculé automatiquement (`prix_unitaire * quantite`).
- Bouton de soumission `id="btnValider"`.

Dans `mesStyles.css` :

- Centrage du formulaire avec une largeur maximale de `600px` et marges automatiques (`margin: 20px auto`).
- Bordure arrondie sur le `<fieldset>` (`border: 2px solid #0066cc; border-radius: 10px; padding: 20px`).
- Style soigné des labels et champs (`display: block` ou mise en tableau avec espacement).
- Bouton `id="btnValider"` mis en valeur (couleur de fond `#0066cc`, texte blanc, padding, coins arrondis, effet au survol).

---

## 2. Validation & Calcul Dynamique (`controles.js`)

Dans le fichier `controles.js` :

- Implémentez la fonction `calculerMontant()` :
  - Déclenchée lors du changement de l'article ou de la modification de la quantité.
  - Multiplie le prix unitaire de l'article sélectionné par la quantité saisie et met à jour le champ `id="montant"`.
- Implémentez la fonction `test1()` appelée lors de la soumission du formulaire (`onsubmit="return test1();"`) :
  - Vérifie que le nom comporte au moins 3 caractères.
  - Vérifie qu'un type de donateur est coché.
  - Vérifie qu'un lycée et un article sont sélectionnés.
  - Vérifie que la quantité est un entier positif (`qte > 0`).
  - Retourne `true` si le formulaire est valide, `false` avec un message d'alerte explicite sinon.

---

## 3. Base de Données & Enregistrement PHP (`db/init.sql` & `enregistrer.php`)

La table `don` est initialisée via le script `db/init.sql` :

```sql
CREATE TABLE IF NOT EXISTS don (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  type_user VARCHAR(30) NOT NULL,
  lycee VARCHAR(60) NOT NULL,
  article VARCHAR(50) NOT NULL,
  qte INT NOT NULL CHECK (qte > 0),
  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  date_don DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

Dans le script PHP `enregistrer.php` :

1. Établissez la connexion avec le serveur MySQL/MariaDB (`mysqli_connect("localhost", "root", "", "labo_db")`).
2. Récupérez et assainissez les données transmises via `$_POST`.
3. Préparez et exécutez la requête d'insertion :
   ```sql
   INSERT INTO don (nom, type_user, lycee, article, qte, montant)
   VALUES ('...', '...', '...', '...', ..., ...);
   ```
4. Affichez un message de confirmation formaté contenant le nom du donateur, l'établissement bénéficiaire et le montant total du don.
