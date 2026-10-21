<?php
// Affichage des droits d'accès relatifs à un document
$con = mysqli_connect("localhost", "root", "", "bd2025");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");

$doc = isset($_POST["doc"]) ? $_POST["doc"] : "";

$stmt = mysqli_prepare($con, "SELECT nomDoc FROM document WHERE idDoc = ?");
mysqli_stmt_bind_param($stmt, "s", $doc);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($res) != 0) {
    $enreg = mysqli_fetch_assoc($res);
    echo "<h2>Les droits d'accès relatifs au document : " . htmlspecialchars($enreg["nomDoc"]) . "</h2><br>";

    $stmt = mysqli_prepare($con, "SELECT u.nomPrenom, d.ecriture, d.lecture, d.impression
                                  FROM droit d INNER JOIN utilisateur u ON u.idUtil = d.idUtil
                                  WHERE d.idDoc = ? ORDER BY u.nomPrenom");
    mysqli_stmt_bind_param($stmt, "s", $doc);
    mysqli_stmt_execute($stmt);
    $res = mysqli_stmt_get_result($stmt);

    echo "<table>";
    while ($ligne = mysqli_fetch_assoc($res)) {
        echo "<tr><td>" . htmlspecialchars($ligne["nomPrenom"]) . "</td><td>" . $ligne["ecriture"]
           . "</td><td>" . $ligne["lecture"] . "</td><td>" . $ligne["impression"] . "</td></tr>";
    }
    echo "</table>";
}
mysqli_close($con);
?>
