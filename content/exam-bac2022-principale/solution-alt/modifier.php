<?php
// Solution Alternative - Bac STI 2022 Session Principale
$conn = mysqli_connect("localhost", "root", "", "bd_agvoy2022");
if (!$conn) {
    die("Échec de connexion MySQLi : " . mysqli_connect_error());
}

$cin = isset($_POST['cin']) ? trim($_POST['cin']) : '';
$nom = isset($_POST['nom']) ? trim($_POST['nom']) : '';
$prenom = isset($_POST['prenom']) ? trim($_POST['prenom']) : '';
$tel = isset($_POST['tel']) ? trim($_POST['tel']) : '';

if (empty($cin) || empty($nom) || empty($prenom) || empty($tel)) {
    die("Champs obligatoires manquants.");
}

// 1. Contrôle d'existence préalable
$check = mysqli_query($conn, "SELECT 1 FROM Eleve WHERE Cin = '$cin'");
if (!$check || mysqli_num_rows($check) === 0) {
    echo "Élève introuvable dans la base de données.";
} else {
    // 2. Requête de mise à jour
    $req = "UPDATE Eleve SET Nom = '$nom', Prenom = '$prenom', Tel = '$tel' WHERE Cin = '$cin'";
    $exec = mysqli_query($conn, $req);
    if ($exec) {
        echo "Les coordonnées de l'élève ont été modifiées avec succès.";
    } else {
        echo "Erreur SQL : " . mysqli_error($conn);
    }
}

mysqli_close($conn);
?>
