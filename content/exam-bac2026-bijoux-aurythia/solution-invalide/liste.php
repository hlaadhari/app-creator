<?php
// Liste des bijoux originaux avec la moyenne des notes de finition
$con = mysqli_connect("localhost", "root", "", "bd2026_bijoux");
if (!$con) {
    die("Erreur de connexion : " . mysqli_connect_error());
}
mysqli_set_charset($con, "utf8mb4");

$res = mysqli_query($con, "SELECT b.idBij, b.description, AVG(e.finition) AS moyenne
                           FROM bijou b INNER JOIN evaluation e ON e.idBij = b.idBij
                           WHERE e.originalite = 'O'
                           GROUP BY b.idBij, b.description
                           ORDER BY b.idBij");
?>
<table border="1">
    <tr><th>Identifiant</th><th>Description</th><th>Moyenne (Finition)</th></tr>
<?php while ($ligne = mysqli_fetch_assoc($res)) { ?>
    <tr>
        <td><?php echo htmlspecialchars($ligne["idBij"]); ?></td>
        <td><?php echo htmlspecialchars($ligne["description"]); ?></td>
        <td><?php echo round($ligne["moyenne"], 2); ?></td>
    </tr>
<?php } ?>
</table>
<?php mysqli_close($con); ?>
