<?php
// Script de mise à jour des coordonnées élève - Bac STI 2022
$host = "localhost";
$user = "root";
$pass = "";
$db   = "bd_agvoy2022";

$conn = mysqli_connect($host, $user, $pass, $db);
if (!$conn) {
    die("Échec de la connexion à la base de données : " . mysqli_connect_error());
}

$cin    = isset($_POST['cin']) ? trim($_POST['cin']) : '';
$nom    = isset($_POST['nom']) ? trim($_POST['nom']) : '';
$prenom = isset($_POST['prenom']) ? trim($_POST['prenom']) : '';
$tel    = isset($_POST['tel']) ? trim($_POST['tel']) : '';

if (empty($cin) || empty($nom) || empty($prenom) || empty($tel)) {
    die("Veuillez remplir tous les champs obligatoires.");
}

// 1. Vérification de l'existence de l'élève
$checkSql = "SELECT * FROM Eleve WHERE Cin = '$cin'";
$checkRes = mysqli_query($conn, $checkSql);

if (!$checkRes || mysqli_num_rows($checkRes) === 0) {
    echo "Élève introuvable dans la base de données.";
} else {
    // 2. Mise à jour des coordonnées
    $updateSql = "UPDATE Eleve SET Nom = '$nom', Prenom = '$prenom', Tel = '$tel' WHERE Cin = '$cin'";
    $updateRes = mysqli_query($conn, $updateSql);

    if ($updateRes) {
        echo "Les coordonnées de l'élève ont été modifiées avec succès.";
    } else {
        echo "Erreur lors de la mise à jour : " . mysqli_error($conn);
    }
}

mysqli_close($conn);
?>
