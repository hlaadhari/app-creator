# Mise en forme & Transitions CSS3

## Contexte

Dans le cadre de l'épreuve pratique du Baccalauréat STI, vous devez concevoir l'interface d'un tableau de bord de laboratoire. La structure HTML est déjà fournie dans `index.html`. Votre mission consiste à appliquer la feuille de style dans `style.css`.

---

## Consignes

1. **Alignement et Modèle de Boîte (`.L1`)** :
   - Configurez les blocs de classe `.L1` pour qu'ils s'affichent sous la forme de blocs en ligne avec `display: inline-block`.
   - Définissez une largeur fixe `width: 250px`.
   - Ajoutez une marge extérieure de `margin: 10px` et un espacement intérieur `padding: 15px`.

2. **Style des Boutons et Cartes (`.b1`)** :
   - Ajoutez une bordure solide de 2px de couleur `#0066cc` (`border: 2px solid #0066cc`).
   - Appliquez un rayon de courbure aux coins de `border-radius: 8px`.
   - Définissez une couleur d'arrière-plan claire `background-color: #f0f7ff`.

3. **Transition Fluide sur le Titre Principal (`h1`)** :
   - Sur l'élément `h1`, configurez une transition fluide sur toutes les propriétés : `transition: all 0.3s ease`.
   - Centrez le titre avec `text-align: center`.

4. **Effet Interactif au Survol (`h1:hover`)** :
   - Au survol (`:hover`), la couleur du texte devient `#0066cc`.
   - Le titre subit un léger agrandissement avec la transformation `transform: scale(1.05)`.
