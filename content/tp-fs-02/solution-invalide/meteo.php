<?php
/**
 * Corrigé officiel - Exercice tp-fs-02
 * Agrégations statistiques MySQLi & rapport météo
 */

// 1. Connexion au serveur de base de données
$cnx = mysqli_connect("localhost", "root", "", "labo_db");

if (!$cnx) {
    die("Échec de connexion : " . mysqli_connect_error());
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    die("Méthode de requête invalide.");
}

$id_station = isset($_POST["station"]) ? intval($_POST["station"]) : 0;
$annee = isset($_POST["annee"]) ? intval($_POST["annee"]) : 0;

if ($id_station <= 0 || $annee < 2020 || $annee > 2026) {
    die("Paramètres de consultation invalides.");
}

// 2. Requête d'agrégation SQL (AVG, MAX, MIN, GROUP BY)
$sql = "SELECT s.nom_station, s.ville, 
               AVG(m.temperature) AS temp_moyenne, 
               MAX(m.temperature) AS temp_max, 
               MIN(m.temperature) AS temp_min, 
               AVG(m.humidite) AS hum_moyenne,
               COUNT(m.id_mesure) AS nb_releves
        FROM station s
        INNER JOIN mesure m ON s.id_station = m.id_station
        WHERE s.id_station = $id_station AND YEAR(m.date_mesure) = $annee
        GROUP BY s.id_station, s.nom_station, s.ville";

$res = mysqli_query($cnx, $sql);

echo "<!DOCTYPE html>";
echo "<html lang='fr'><head><meta charset='UTF-8'><title>Synthèse Météorologique</title>";
echo "<style>
        body { font-family: sans-serif; margin: 30px auto; max-width: 700px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: center; }
        th { background: #0066cc; color: white; }
        tr:nth-child(even) { background: #f8fafc; }
        .alert { background: #eff6ff; border-left: 4px solid #0066cc; padding: 12px; margin-bottom: 20px; }
      </style>";
echo "</head><body>";
echo "<h1>Rapport Météorologique Annuel ($annee)</h1>";

if ($res && mysqli_num_rows($res) > 0) {
    $row = mysqli_fetch_assoc($res);
    echo "<div class='alert'>";
    echo "<strong>Station :</strong> " . htmlspecialchars($row["nom_station"]) . " (" . htmlspecialchars($row["ville"]) . ")<br>";
    echo "<strong>Total de relevés analysés :</strong> " . $row["nb_releves"];
    echo "</div>";

    echo "<table>";
    echo "<thead><tr>";
    echo "<th>Indicateur</th><th>Valeur Calculée</th>";
    echo "</tr></thead><tbody>";
    echo "<tr><td>Température Moyenne</td><td><strong>" . number_format($row["temp_moyenne"], 1) . " °C</strong></td></tr>";
    echo "<tr><td>Température Maximale</td><td><span style='color: #dc2626; font-weight: bold;'>" . $row["temp_max"] . " °C</span></td></tr>";
    echo "<tr><td>Température Minimale</td><td><span style='color: #2563eb; font-weight: bold;'>" . $row["temp_min"] . " °C</span></td></tr>";
    echo "<tr><td>Humidité Moyenne</td><td>" . number_format($row["hum_moyenne"], 1) . " %</td></tr>";
    echo "</tbody></table>";
} else {
    echo "<p>Aucun relevé disponible pour cette station en $annee.</p>";
}

echo "<p style='margin-top: 24px;'><a href='consultation.html'>Nouvelle consultation</a></p>";
echo "</body></html>";

mysqli_close($cnx);
?>
