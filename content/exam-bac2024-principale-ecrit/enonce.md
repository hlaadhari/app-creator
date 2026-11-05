# Examen du Baccalauréat — Session Principale 2024

**Épreuve :** Systèmes et Technologies de l'Informatique (STI)  
**Section :** Sciences de l'informatique  
**Durée :** 3 heures — **Coefficient :** 1.8 — **Barème :** 20 points

---

## Exercice N°1 (2 points) — QCM Notions Web & Programmation

Pour chacune des questions ci-dessous, mettre une croix (X) dans la case correspondante à la réponse correcte.

1. **En HTML**, quelle est la signification du mot `href` dans l'exemple ci-dessous ?
   `<a href="http://www.programming.info"> Suivez le lien </a>`
   - [ ] Un attribut
   - [ ] Une valeur
   - [ ] Un élément

2. **En PHP**, quelle sera la valeur de la variable `$X` après exécution de l'instruction suivante ?
   `$X = (int)2.99;`
   - [ ] NULL
   - [ ] 2
   - [ ] 3

3. **En PHP**, quelle est l'instruction qui permet d'afficher le nombre d'éléments d'un tableau d'entiers nommé `$A` ?
   - [ ] `echo(count($A));`
   - [ ] `echo(num_rows($A));`
   - [ ] `echo(array($A));`

4. **En CSS**, que représente `#cercle` dans la règle suivante ?
   `#cercle { color: green; }`
   - [ ] une propriété
   - [ ] une valeur
   - [ ] un sélecteur

5. **En CSS**, quelle est la déclaration qui permet de faire pivoter un élément de 45 degrés ?
   - [ ] `translate : rotate(45deg);`
   - [ ] `transform : rotate(45deg);`
   - [ ] `rotate : transform(45deg);`

6. **En JavaScript**, qu'affiche l'instruction suivante ?
   `alert("1" + "2")`
   - [ ] 3
   - [ ] 12
   - [ ] erreur

7. **En JavaScript**, quelle est l'instruction qui permet d'afficher l'année sur 4 chiffres d'un objet `D` de type `Date` ?
   - [ ] `alert(D.getDate())`
   - [ ] `alert(D.setFullYear())`
   - [ ] `alert(D.getFullYear())`

8. **En JavaScript**, que renvoie `parseFloat("12.5")` ?
   - [ ] 12
   - [ ] 12.5
   - [ ] NaN

---

## Exercice N°2 (5 points) — Base HippieTeams (Courses Hippiques)

HippieTeams est une association qui regroupe des amateurs de chevaux. Elle organise des compétitions hippiques mensuelles comportant plusieurs courses qui se déroulent au cours d'une même journée.

### Modèle Relationnel Initial

- **Proprietaire** (`idProp`, `nomProp`, `telProp`)
- **Cheval** (`idCheval`, `nomCheval`, `idProp#`)
- **Course** (`idCourse`, `heureCourse`, `distance`, `idComp#`)
- **Competition** (`idComp`, `nomComp`, `date`)
- **Resultat** (`idCourse#`, `idCheval#`, `rang`, `temps`)

---

## Exercice N°3 (13 points) — Base « Gestion_Barrage » & Programmation Web

Dans le cadre de la gestion des ressources hydrauliques, on dispose d'un site web qui diffuse les données des barrages des différentes régions de la Tunisie.

### Modèle Relationnel Initial

- **Barrage** (`idBar`, `nomBar`, `volume`, `hauteur`, `superficie`)
- **NiveauEau** (`dateNiv`, `idBar#`, `niveau`)
- **Vanne** (`idVan`, `etatVan`, `idBar#`)
- **Capteur** (`idCapt`, `refCapt`, `idVan#`)
- **Mesure** (`idMes`, `valMes`, `dateMes`, `idCapt#`)
- **Alerte** (`idAlert`, `degAlert`, `statAlert`, `idMes#`)
