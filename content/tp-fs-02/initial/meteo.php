<?php
// ==============================================================================
// TP Météo : Traitement PHP & Agrégations SQL
// ==============================================================================

// 1. Connexion au serveur MySQL
$cnx = mysqli_connect("localhost", "root", "", "meteo_db");

// 2. Récupérer les paramètres POST

// 3. Exécuter la requête d'agrégation (AVG, MAX, MIN, GROUP BY)

// 4. Afficher les résultats sous forme de tableau HTML
mysqli_close($cnx);
?>
