# Guide de Rédaction des Critères Pédagogiques — Labo STI

> **Document de référence** : PRD v3.1 (§10.4 & §18.1)  
> **Destinataires** : Enseignants concepteurs de sujets, contributeurs pédagogiques

---

## 1. Principes Fondamentaux de Rédaction

Rédiger un critère d'évaluation automatique fiable est un nouveau métier pour l'enseignant. Un critère mal conçu peut générer de la frustration (**faux négatifs** : code juste rejeté) ou une complaisance trompeuse (**faux positifs** : code faux accepté).

### Les 5 Règles d'Or

1. **Tester le résultat observable, pas la syntaxe** :
   - ✅ _Vérifier que le texte de l'élément `#total` vaut "5" après 5 clics._
   - ❌ _Rechercher la chaîne exacte `for (let i = 0; i < 5; i++)` dans le fichier JavaScript._
2. **Tolérer les variantes valides** :
   - Accepter les couleurs équivalentes (`#0066cc`, `rgb(0, 102, 204)`, `hsl(...)`).
   - Tolérer les espaces insécables ou les différences de casse non sémantiques.
3. **Fournir un message pédagogique précis en cas d'échec** :
   - Indiquer ce qui manque ou ce qui cloche sans donner la solution directement.
4. **Découper en micro-critères avec barème progressif** :
   - Favoriser 4 critères à 1 point plutôt qu'un critère monolithique à 4 points pour permettre un crédit partiel équitable.
5. **Prévoir 3 niveaux d'indices progressifs** :
   - Niveau 1 : Rappel de la notion théorique ou de la balise concernée.
   - Niveau 2 : Indication sur le sélecteur ou la fonction à mobiliser.
   - Niveau 3 : Syntaxe guidée ou exemple proche sans révéler le code exact du sujet.

---

## 2. Modèles de Tests Prêts à l'Emploi

Les critères sont définis sous forme d'objets JSON déclaratifs stockés dans la table `criteres`.

### 2.1 Critères HTML / Structure DOM

```json
{
  "code": "html-form-email",
  "ordre": 1,
  "label": "Champ e-mail présent dans le formulaire",
  "points": 2,
  "message_echec": "Le formulaire doit contenir un champ de saisie avec le type « email ».",
  "sonde": {
    "k": "count",
    "sel": "form input[type=email]"
  },
  "attendu": {
    "op": "gte",
    "v": 1
  }
}
```

### 2.2 Critères CSS / Styles Calculés

```json
{
  "code": "css-bouton-arrondi",
  "ordre": 2,
  "label": "Bouton avec coins arrondis",
  "points": 1,
  "message_echec": "Ajoutez un border-radius supérieur à 0 sur le bouton #valider.",
  "sonde": {
    "k": "css",
    "sel": "#valider",
    "prop": "border-top-left-radius"
  },
  "attendu": {
    "op": "gtnum",
    "v": 0
  }
}
```

### 2.3 Critères JavaScript / Interactions et Événements

```json
{
  "code": "js-clic-increment",
  "ordre": 3,
  "label": "Incrémentation au clic sur #plus",
  "points": 3,
  "message_echec": "Après un clic sur #plus, le compteur #total doit afficher 1.",
  "sonde": {
    "actions": [{ "click": "#plus", "n": 1 }],
    "obs": { "k": "text", "sel": "#total" }
  },
  "attendu": {
    "op": "eq",
    "v": "1"
  }
}
```

### 2.4 Critères PHP (Phase 2)

```json
{
  "code": "php-post-insert",
  "ordre": 4,
  "label": "Insertion en base lors d'une soumission POST",
  "points": 4,
  "message_echec": "L'envoi du formulaire d'inscription n'a inséré aucune nouvelle ligne dans la table `utilisateurs`.",
  "sonde": {
    "req": {
      "method": "POST",
      "url": "inscription.php",
      "body": { "nom": "Dupont", "email": "d@test.fr" }
    },
    "obs": {
      "k": "sql_count",
      "query": "SELECT COUNT(*) FROM utilisateurs WHERE email = 'd@test.fr'"
    }
  },
  "attendu": {
    "op": "eq",
    "v": 1
  }
}
```

---

## 3. Obligation de Test Pré-Publication

> [!IMPORTANT]
> Avant de publier une version de sujet (`publiee = true`), la plateforme et la CI imposent l'exécution de la suite de validation pédagogique :
>
> 1. **Solution Valide A** (approche canonique standard) -> doit obtenir **100 % des points**.
> 2. **Solution Valide B** (approche alternative valide : ex. boucle différente, sélecteurs distincts, flexbox vs grid) -> doit obtenir **100 % des points**.
> 3. **Solution Invalide C** (erreur courante d'élève : oubli d'attribut, faute de frappe, logique incomplète) -> doit échouer sur le critère ciblé sans valider les points indûment.

Si une solution valide échoue, la publication de la version est **bloquée**.

---

## 4. Gestion des Contestations d'Élèves

1. L'élève dispose d'un bouton discret : _« Ce critère me semble injuste »_.
2. Sa contestation est enregistrée dans la table `contestations` avec le code exact du fichier au moment du clic.
3. L'enseignant consulte la file de contestations :
   - Si le critère est effectivement ambigu ou trop rigide, l'enseignant peut **désactiver le critère** (`criteres.actif = false`).
   - Le système recalcule automatiquement les scores de tous les élèves impactés sans effacer les tentatives historiques.
