<?php
include "connexion.php";

$dest = isset($_POST["dest"]) ? intval($_POST["dest"]) : 0;
$d1   = isset($_POST["DD"]) ? $_POST["DD"] : "";
$d2   = isset($_POST["DF"]) ? $_POST["DF"] : "";

// Informations supplémentaires cochées dans croisiere.html
$duree    = isset($_POST["duree"]);
$prix     = isset($_POST["prix"]);
$capacite = isset($_POST["capacite"]);

$stmt = mysqli_prepare($con, "SELECT c.libCro, n.nomNav, c.dateDepart, c.duree, c.prix, n.capacite
                              FROM croisiere c INNER JOIN navire n ON n.idNav = c.idNav
                              WHERE c.idDes = ? AND c.dateDepart BETWEEN ? AND ?
                              ORDER BY c.dateDepart ASC");
mysqli_stmt_bind_param($stmt, "iss", $dest, $d1, $d2);
mysqli_stmt_execute($stmt);
$res = mysqli_stmt_get_result($stmt);

if (mysqli_num_rows($res) == 0) {
    echo "Aucune croisière programmée pour cette période";
} else {
    echo "<table border=\"1\"><tr><th>Croisière</th><th>Navire</th><th>Départ</th>";
    if ($duree)    echo "<th>Durée</th>";
    if ($prix)     echo "<th>Prix</th>";
    if ($capacite) echo "<th>Capacité</th>";
    echo "</tr>";

    while ($ligne = mysqli_fetch_assoc($res)) {
        echo "<tr><td>" . htmlspecialchars($ligne["libCro"]) . "</td><td>" . htmlspecialchars($ligne["nomNav"])
           . "</td><td>" . $ligne["dateDepart"] . "</td>";
        if ($duree)    echo "<td>" . $ligne["duree"] . "</td>";
        if ($prix)     echo "<td>" . $ligne["prix"] . "</td>";
        if ($capacite) echo "<td>" . $ligne["capacite"] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
}
mysqli_close($con);
?>
