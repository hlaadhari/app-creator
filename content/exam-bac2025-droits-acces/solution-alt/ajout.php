<?php
// Ajout d'un utilisateur (table utilisateur)
$con = mysqli_connect("localhost", "root", "", "bd2025");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");

$idUtil    = isset($_POST["idUtil"]) ? $_POST["idUtil"] : "";
$nomPrenom = isset($_POST["nomPrenom"]) ? $_POST["nomPrenom"] : "";

$stmt = mysqli_prepare($con, "INSERT INTO utilisateur (idUtil, nomPrenom) VALUES (?, ?)");
mysqli_stmt_bind_param($stmt, "ss", $idUtil, $nomPrenom);

if (@mysqli_stmt_execute($stmt)) {
    echo "Utilisateur ajouté avec succès";
} else {
    echo "Erreur d'insertion des données";
}
mysqli_close($con);
?>
