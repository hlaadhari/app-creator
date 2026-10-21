<?php
include "connexion.php";

$idCl  = isset($_POST["idCl"]) ? trim($_POST["idCl"]) : "";
// Espaces de début et de fin supprimés, première lettre de chaque mot en majuscule
$nomCl = ucwords(trim(isset($_POST["nomCl"]) ? $_POST["nomCl"] : ""));
$telCl = isset($_POST["telCl"]) ? intval($_POST["telCl"]) : 0;
$idCro = isset($_POST["idCro"]) ? $_POST["idCro"] : "";
$nbPlace = isset($_POST["nbPlace"]) ? intval($_POST["nbPlace"]) : 0;

// 1) Le client a-t-il déjà réservé cette croisière ?
$stmt = mysqli_prepare($con, "SELECT idCl FROM reservation WHERE idCl = ? AND idCro = ?");
mysqli_stmt_bind_param($stmt, "ss", $idCl, $idCro);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);

if (mysqli_stmt_num_rows($stmt) != 0) {
    echo "Réservation déjà faite";
} else {
    // 2) Création du client s'il n'existe pas encore
    $stmt = mysqli_prepare($con, "SELECT idCl FROM client WHERE idCl = ?");
    mysqli_stmt_bind_param($stmt, "s", $idCl);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);

    if (mysqli_stmt_num_rows($stmt) == 0) {
        $stmt = mysqli_prepare($con, "INSERT INTO client (idCl, nomCl, telCl) VALUES (?, ?, ?)");
        mysqli_stmt_bind_param($stmt, "ssi", $idCl, $nomCl, $telCl);
        mysqli_stmt_execute($stmt);
    }

    // 3) Enregistrement de la réservation, avec la date et l'heure système
    $stmt = mysqli_prepare($con, "INSERT INTO reservation (idCl, idCro, dateRes, nbPlace) VALUES (?, ?, NOW(), ?)");
    mysqli_stmt_bind_param($stmt, "ssi", $idCl, $idCro, $nbPlace);
    mysqli_stmt_execute($stmt);

    echo "Réservation enregistrée dans l'attente de confirmation";
}
mysqli_close($con);
?>
