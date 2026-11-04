<?php
$conn = mysqli_connect("localhost", "root", "", "bd_agvoy2022");
if (!$conn) {
    die("Erreur de connexion.");
}
$res = mysqli_query($conn, "SELECT E.NumEx, E.DateEx, E.PrixEx, S.LibSite, V.LibVille FROM Excursion E JOIN Site S ON E.NumSite = S.NumSite JOIN Ville V ON S.NumVille = V.NumVille");
echo "<h2>Liste des Excursions</h2>";
while ($row = mysqli_fetch_assoc($res)) {
    echo "<p>Excursion N°" . $row['NumEx'] . " - " . $row['LibSite'] . " (" . $row['LibVille'] . ") : " . $row['PrixEx'] . " DT</p>";
}
mysqli_close($conn);
?>
