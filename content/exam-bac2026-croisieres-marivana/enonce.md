# Épreuve Pratique du Baccalauréat STI — Session 2026 (12h30)

## Sujet : Marivana Voyages, croisières et réservations

**Durée :** 2 heures (120 minutes)  
**Coefficient :** 1.2  
**Note Maximale :** 20 points (Mode Examen)

---

## Contexte

**Marivana Voyages** organise des voyages maritimes à bord de ses navires. La compagnie souhaite un site Web pour :

- consulter la liste des croisières disponibles ;
- réserver des places pour une croisière.

Ressources fournies : `croisiere.sql`, `photo.html`, `croisiere.html`, `styles2.css`, `connexion.php`, `navire.png` et les images `img1.png` à `img8.png`. Le dossier de travail se nomme `SW<numéro d'inscription>`.

Représentation textuelle de la base (nommée `bd2026_croisieres` dans la plateforme) :

```
navire      (idNav, nomNav, capacite)
destination (idDes, nomDes)
croisiere   (idCro, libCro, duree, prix, dateDepart, idDes#, idNav#)
client      (idCl, nomCl, telCl)
reservation (idCl#, idCro#, dateRes, nbPlace)
```

| Champ | Type et propriété(s) |
| --- | --- |
| `idNav` | Chaîne de 3 caractères |
| `nomNav` | Chaîne de 100 caractères, unique |
| `capacite` | Entier (nombre de places) |
| `idDes` | Entier |
| `nomDes` | Chaîne de 100 caractères, unique |
| `idCro` | Chaîne de 5 caractères |
| `libCro` | Chaîne de 100 caractères, unique |
| `duree` | Entier (jours) |
| `prix` | Entier (dinars, prix d'une place) |
| `dateDepart` | Date |
| `idCl` | Chaîne de 10 caractères |
| `nomCl` | Chaîne de 100 caractères (nom et prénom) |
| `telCl` | Entier |
| `dateRes` | Date et heure |
| `nbPlace` | Entier |

---

## Travail Demandé

### Étape 1 : base de données

1. Créer la base de données.
2. Importer `croisiere.sql`.
3. Créer la table `reservation` conformément à la description des champs.
4. Établir les relations entre les tables.
5. Exporter la base au format SQL dans le dossier de travail.

### Étape 2 : documents Web

Consignes : les fonctions JavaScript vont dans un nouveau fichier `controles2.js`, les règles CSS dans `styles2.css`, toutes les pages sont liées à `styles2.css`, `croisiere.html` et `reservation.html` sont liées à `controles2.js`, et le bouton « Annuler » de chaque formulaire réinitialise les champs.

**1. Page `index.html`**

- `<header>` : un `<span>` « Marivana Voyages » et une image `navire.png`.
- `<main>` : une navigation `<nav>` (liens « Album photos » vers `photo.html`, « Nos croisières » vers `croisiere.html`, « Réservation » vers `reservation.html`) et une `<section>` affichant `photo.html` par défaut.
- Mise en forme : le texte a une marge de 30px en haut et à gauche et une taille de police de 60px ; l'image a des coins arrondis (rayon 50%) ; le texte et l'image ont une transparence de 0.5 et se trouvent sur la même ligne, le texte à 100px du bord gauche de son conteneur et l'image à 100px du bord droit.

**2. Page `photo.html`** (album publicitaire)

- Ajouter à `<figure>` la légende « Avec Marivana Voyages, embarquez pour une aventure inoubliable ! » et un pied de page « Contacts : 82 200 200/ croisiere@maritime.tn ».
- Au survol, une image est agrandie 2 fois avec une transition de 3 secondes ; le texte du pied de page et la figure sont centrés ; le texte du pied de page a une ombre `#FFFFFF` décalée de 5px.

**3. Page `croisiere.html`** : recherche des croisières d'une destination sur une période.

- Le bouton « Chercher » appelle `verif1` et `croisiere.php`. Destinations (attribut `value`) : Alexandrie `1`, Barcelone `2`, Beyrouth `3`. Ajouter trois cases à cocher (Durée, Prix, Capacité) au fieldset « Informations supplémentaires à afficher ».
- `verif1` : destination obligatoire ; Date 1 strictement supérieure à la date système ; Date 2 strictement supérieure à Date 1.
- `connexion.php` : à modifier pour établir la connexion au serveur et à la base.
- `croisiere.php` : inclut `connexion.php` ; affiche « Aucune croisière programmée pour cette période » s'il n'y a aucun résultat, sinon un tableau (Croisière, Navire, Départ, puis Durée, Prix et Capacité seulement si cochées) trié par date de départ croissante. La mise en forme du tableau n'est pas demandée.

**4. Page `reservation.html`**

- Formulaire : type d'identifiant, identifiant, nom et prénom, téléphone (type `tel`), croisière (Eclat méditerranéen `101`, Perle d'Azur `102`, Riviera des Mers `103`), nombre de places de 1 à 10 avec un élément `<output id="nb">` affichant « 1/10 ». Chaque changement du nombre de places appelle `nombres` ; le bouton « Valider » appelle `verif2` et `reservation.php`.
- `nombres` : affiche dans `nb` la valeur du nombre de places suivie de `/10`.
- `verif2` : type d'identifiant obligatoire ; identifiant = une lettre suivie de 9 chiffres pour un passeport, 8 chiffres pour un CIN ; nom et prénom = lettres et espaces uniquement, au moins 7 lettres.
- `reservation.php` : supprime les espaces de début et de fin du nom et met en majuscule la première lettre de chaque mot ; affiche « Réservation déjà faite » si le client a déjà réservé cette croisière ; sinon crée le client s'il n'existe pas, enregistre la réservation (`dateRes` = date et heure système) et affiche « Réservation enregistrée dans l'attente de confirmation ».

---

## Barème Officiel

| Partie | Critère Évalué | Points |
| --- | --- | --- |
| **Étape 1** | Manipulation de la base de données | 1,5 pts |
| **Étape 2-1** | Page `index.html` : structure (1,5) et mise en forme (1,5) | 3 pts |
| **Étape 2-2** | Album photos : HTML (0,5) et CSS (1) | 1,5 pts |
| **Étape 2-3** | Recherche : HTML (1,25), `verif1` (1,5), `connexion.php` (0,5), `croisiere.php` (2,5) | 5,75 pts |
| **Étape 2-4** | Réservation : HTML (2), `nombres` et `verif2` (2,25), `reservation.php` (4) | 8,25 pts |
| **Total** | **Note Globale Bac Pratique** | **20 points** |
