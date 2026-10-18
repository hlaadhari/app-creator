# Validation JS – Contrôle CIN & Chaînes de Caractères

## Contexte

Dans les épreuves pratiques d'informatique du Baccalauréat STI, la saisie sécurisée des identifiants élèves ou candidats impose une validation rigoureuse côté client en JavaScript avant toute soumission au serveur.

Le formulaire fourni dans `formulaire.html` contient un champ de saisie avec l'identifiant `cin` et un bouton de validation déclenchant la fonction `verif()`.

---

## Consignes

Dans le fichier `controle.js`, implémentez la fonction `verif()` :

1. **Récupération de la Valeur** :
   - Récupérez la valeur saisie dans le champ d'identifiant `cin` (ou `document.f.cin.value`).

2. **Contrôle de Longueur Exacte** :
   - Le numéro CIN doit comporter **exactement 8 caractères** (`cin.length === 8`).
   - Si la longueur est différente de 8, affichez une alerte avec `alert("Le CIN doit comporter exactement 8 chiffres")` et retournez `false`.

3. **Contrôle Numérique Strict** :
   - Le numéro CIN ne doit contenir que des chiffres décimaux (`0` à `9`).
   - Si le champ contient des lettres, espaces ou symboles, affichez un message d'erreur et retournez `false`.
   - Vous pouvez utiliser une expression régulière (ex: `/^[0-9]{8}$/`) ou tester la composition caractère par caractère.

4. **Validation Positive** :
   - Si toutes les conditions sont remplies, la fonction retourne `true`.
