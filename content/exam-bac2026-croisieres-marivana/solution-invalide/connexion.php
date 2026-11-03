<?php
$serveur ="localhost";
$utilisateur = "root";
$motdepasse = "";
$nombase = "bd2026_croisieres";

// Connexion au serveur et accès à la base de données
$con = mysqli_connect($serveur, $utilisateur, $motdepasse, $nombase);
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");
?>
