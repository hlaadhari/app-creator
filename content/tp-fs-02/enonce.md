# TP de Synthèse Full-Stack : Consultation Météo & Agrégations (Bac 2021)

## Contexte

Dans le cadre d'un réseau régional de stations météo connectées, les relevés de température et d'humidité sont stockés de façon continue dans une base de données MySQL. L'objectif est de développer une interface permettant aux techniciens d'interroger la base et de calculer les indicateurs statistiques (moyenne, minimum, maximum) par station.

---

## 1. Interface de Consultation (`consultation.html`)

Créez le formulaire dans `consultation.html` :

- Méthode `POST`, pointant vers `meteo.php`, appelant la fonction `return test2();` à la soumission.
- Une liste déroulante `<select id="station" name="station">` proposant :
  - Option 0 : « -- Choisir une station -- » (valeur vide)
  - Option 1 : « Station Nord (Tunis) » (valeur `1`)
  - Option 2 : « Station Sahel (Sousse) » (valeur `2`)
  - Option 3 : « Station Sud (Sfax) » (valeur `3`)
- Un champ pour l'année d'observation `<input type="number" id="annee" name="annee" min="2020" max="2026" placeholder="2026">`.
- Un bouton de soumission `<button type="submit" id="btnConsulter">Afficher les statistiques</button>`.

---

## 2. Validation Côté Client (`controle.js`)

Dans `controle.js`, écrivez la fonction `test2()` :

- Vérifie qu'une station a bien été sélectionnée (valeur différente de chaîne vide).
- Vérifie que l'année saisie est comprise entre `2020` et `2026`.
- En cas d'erreur, affiche un message avec `alert()` et retourne `false`.
- Retourne `true` si toutes les données sont valides.

---

## 3. Base de Données (`db/init.sql`)

Les tables `station` et `mesure` sont initialisées avec des relevés de température et d'humidité :

- Table `station (id_station, nom_station, ville, altitude)`.
- Table `mesure (id_mesure, id_station, temperature, humidite, date_mesure)`.

---

## 4. Traitement & Agrégations Statistiques (`meteo.php`)

Dans `meteo.php` :

1. Connexion au serveur MySQL via `mysqli_connect()`.
2. Récupération des paramètres `$_POST["station"]` et `$_POST["annee"]`.
3. Exécution d'une requête SQL d'agrégation calculant :
   - Le nom de la station (`nom_station`).
   - La température moyenne (`AVG(temperature)` arrondie à 1 décimale).
   - La température maximale (`MAX(temperature)`).
   - La température minimale (`MIN(temperature)`).
   - Le taux moyen d'humidité (`AVG(humidite)`).
   - Requête regroupée par station (`GROUP BY s.nom_station`).
4. Affichage des résultats dans un tableau HTML propre et structuré.
