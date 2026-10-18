<?php
// ==============================================================================
// TP Full-Stack : Traitement et Insertion PHP / MySQLi
// ==============================================================================

// 1. Connexion à la base de données
$cnx = mysqli_connect("localhost", "root", "", "labo_db");

if (!$cnx) {
    die("Erreur de connexion : " . mysqli_connect_error());
}

// 2. Récupérer les données POST

// 3. Préparer et exécuter la requête d'insertion INSERT INTO don

// 4. Afficher le message de confirmation
mysqli_close($cnx);
?>
