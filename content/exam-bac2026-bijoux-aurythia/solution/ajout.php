<?php
// Ajout d'un bijou et de sa composition (tables bijou et composition)
$con = mysqli_connect("localhost", "root", "", "bd2026_bijoux");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$idBij = isset($_POST["idBij"]) ? $_POST["idBij"] : "";
$desc  = isset($_POST["desc"]) ? $_POST["desc"] : "";
$prix  = isset($_POST["prix"]) ? intval($_POST["prix"]) : 0;
$poids = isset($_POST["poids"]) ? intval($_POST["poids"]) : 0;

// Métaux cochés : c1 (Argent), c2 (Or), c3 (Platine)
$metaux = array();
foreach (array("c1", "c2", "c3") as $c) {
    if (isset($_POST[$c])) {
        $metaux[] = $_POST[$c];
    }
}

try {
    // Les deux insertions réussissent ensemble ou échouent ensemble
    mysqli_begin_transaction($con);

    $stmt = mysqli_prepare($con, "INSERT INTO bijou (idBij, description, prixVente, poids) VALUES (?, ?, ?, ?)");
    mysqli_stmt_bind_param($stmt, "ssii", $idBij, $desc, $prix, $poids);
    mysqli_stmt_execute($stmt);

    $stmt = mysqli_prepare($con, "INSERT INTO composition (idBij, idMet) VALUES (?, ?)");
    foreach ($metaux as $idMet) {
        mysqli_stmt_bind_param($stmt, "ss", $idBij, $idMet);
        mysqli_stmt_execute($stmt);
    }

    mysqli_commit($con);
    echo "Ajout effectué avec succès";
} catch (mysqli_sql_exception $e) {
    mysqli_rollback($con);
    echo "Erreur d'insertion";
}
mysqli_close($con);
?>
