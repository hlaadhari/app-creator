<?php
// Enregistrement de l'évaluation d'un bijou par un expert
$con = mysqli_connect("localhost", "root", "", "bd2026_bijoux");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");

$idBij       = isset($_POST["idBij"]) ? $_POST["idBij"] : "";
$expert      = isset($_POST["expert"]) ? $_POST["expert"] : "";
$finition    = isset($_POST["finition"]) ? intval($_POST["finition"]) : 0;
$originalite = isset($_POST["originalite"]) ? $_POST["originalite"] : "";
$commentaire = isset($_POST["commentaire"]) ? $_POST["commentaire"] : "";

// 1) Le bijou existe-t-il ?
$stmt = mysqli_prepare($con, "SELECT idBij FROM bijou WHERE idBij = ?");
mysqli_stmt_bind_param($stmt, "s", $idBij);
mysqli_stmt_execute($stmt);
mysqli_stmt_store_result($stmt);

if (mysqli_stmt_num_rows($stmt) == 0) {
    echo "Bijou inexistant";
} else {
    // 2) Déjà évalué par cet expert ?
    $stmt = mysqli_prepare($con, "SELECT idBij FROM evaluation WHERE idBij = ? AND idExp = ?");
    mysqli_stmt_bind_param($stmt, "ss", $idBij, $expert);
    mysqli_stmt_execute($stmt);
    mysqli_stmt_store_result($stmt);

    if (mysqli_stmt_num_rows($stmt) != 0) {
        echo "Bijou déjà évalué par cet expert";
    } else {
        // 3) Enregistrement, avec la date et l'heure système
        $stmt = mysqli_prepare($con, "INSERT INTO evaluation (idExp, idBij, finition, originalite, commentaire, dateEv) VALUES (?, ?, ?, ?, ?, NOW())");
        mysqli_stmt_bind_param($stmt, "ssiss", $expert, $idBij, $finition, $originalite, $commentaire);
        mysqli_stmt_execute($stmt);
        echo "Evaluation enregistrée avec succès";
    }
}
mysqli_close($con);
?>
