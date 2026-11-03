<?php
// Attribution (insertion ou mise à jour) des droits d'accès d'un utilisateur pour un document
$con = mysqli_connect("localhost", "root", "", "bd2025");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");

$idUtil     = isset($_POST["idUtil"]) ? $_POST["idUtil"] : "";
$doc        = isset($_POST["doc"]) ? $_POST["doc"] : "";
// Une case non cochée n'est pas transmise : le droit vaut alors "N"
$ecriture   = isset($_POST["ecriture"]) ? "O" : "N";
$lecture    = isset($_POST["lecture"]) ? "O" : "N";
$impression = isset($_POST["impression"]) ? "O" : "N";

// 1) L'utilisateur existe-t-il ?
$stmt = mysqli_prepare($con, "SELECT idUtil FROM utilisateur WHERE idUtil = ?");
mysqli_stmt_bind_param($stmt, "s", $idUtil);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);

if (mysqli_stmt_num_rows($stmt) == 0) {
    echo "Erreur : Utilisateur inexistant";
} else {
    // 2) A-t-il déjà des droits sur ce document ?
    $stmt = mysqli_prepare($con, "SELECT idUtil FROM droit WHERE idUtil = ? AND idDoc = ?");
    mysqli_stmt_bind_param($stmt, "ss", $idUtil, $doc);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);

    if (mysqli_stmt_num_rows($stmt) != 0) {
        $stmt = mysqli_prepare($con, "UPDATE droit SET ecriture = ?, lecture = ?, impression = ? WHERE idUtil = ? AND idDoc = ?");
        mysqli_stmt_bind_param($stmt, "sssss", $ecriture, $lecture, $impression, $idUtil, $doc);
        mysqli_stmt_execute($stmt);
        echo "Mise à jour des droits d'accès réussie";
    } else {
        $stmt = mysqli_prepare($con, "INSERT INTO droit (idDoc, idUtil, ecriture, lecture, impression) VALUES (?, ?, ?, ?, ?)");
        mysqli_stmt_bind_param($stmt, "sssss", $doc, $idUtil, $ecriture, $lecture, $impression);
        mysqli_stmt_execute($stmt);
        echo "Insertion des droits d'accès réussie";
    }
}
mysqli_close($con);
?>
