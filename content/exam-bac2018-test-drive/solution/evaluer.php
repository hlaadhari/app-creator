<?php
/**
 * Bac STI 2018 - Évaluation Véhicule (Test Drive)
 * Script de traitement PHP 8.2 avec requêtes d'agrégation SQL
 */

// 1. Connexion au serveur de base de données
$host = "localhost";
$user = "root";
$pass = "";
$db   = "bd_testdrive";

$conn = mysqli_connect($host, $user, $pass, $db);
if (!$conn) {
    die("<p style='color: red;'>Erreur de connexion à la base de données : " . mysqli_connect_error() . "</p>");
}

// 2. Extraction des données transmises par POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    die("<p style='color: red;'>Méthode de requête non autorisée.</p>");
}

$cin           = isset($_POST["cin"]) ? trim($_POST["cin"]) : "";
$immat         = isset($_POST["immatriculation"]) ? trim($_POST["immatriculation"]) : "";
$date_test     = isset($_POST["date_test"]) ? trim($_POST["date_test"]) : "";
$note_confort  = isset($_POST["note_confort"]) ? intval($_POST["note_confort"]) : 0;
$note_conduite = isset($_POST["note_conduite"]) ? intval($_POST["note_conduite"]) : 0;
$note_securite = isset($_POST["note_securite"]) ? intval($_POST["note_securite"]) : 0;
$commentaire   = isset($_POST["commentaire"]) ? trim($_POST["commentaire"]) : "";

// Validation des données
if (strlen($cin) !== 8 || !is_numeric($cin) || empty($immat) || empty($date_test)
    || $note_confort < 1 || $note_confort > 5
    || $note_conduite < 1 || $note_conduite > 5
    || $note_securite < 1 || $note_securite > 5) {
    die("<p style='color: red;'>Données de notation invalides ou incomplètes.</p>");
}

// 3. Vérification de l'existence du client
$sqlClient = "SELECT cin, nom, prenom FROM client WHERE cin = ?";
$stmtClient = mysqli_prepare($conn, $sqlClient);
mysqli_stmt_bind_param($stmtClient, "s", $cin);
mysqli_stmt_execute($stmtClient);
$resClient = mysqli_stmt_get_result($stmtClient);

if (mysqli_num_rows($resClient) === 0) {
    echo "<p style='color: red;'>Le client avec le CIN <strong>" . htmlspecialchars($cin) . "</strong> n'est pas enregistré.</p>";
    mysqli_close($conn);
    exit;
}
$client = mysqli_fetch_assoc($resClient);

// 4. Vérification de l'existence de la voiture
$sqlVoiture = "SELECT immatriculation, marque, modele, energie FROM voiture WHERE immatriculation = ?";
$stmtVoiture = mysqli_prepare($conn, $sqlVoiture);
mysqli_stmt_bind_param($stmtVoiture, "s", $immat);
mysqli_stmt_execute($stmtVoiture);
$resVoiture = mysqli_stmt_get_result($stmtVoiture);

if (mysqli_num_rows($resVoiture) === 0) {
    echo "<p style='color: red;'>Le véhicule sélectionné est introuvable.</p>";
    mysqli_close($conn);
    exit;
}
$voiture = mysqli_fetch_assoc($resVoiture);

// 5. Insertion de l'évaluation
$sqlInsert = "INSERT INTO evaluation (cin, immatriculation, date_test, note_confort, note_conduite, note_securite, commentaire) VALUES (?, ?, ?, ?, ?, ?, ?)";
$stmtInsert = mysqli_prepare($conn, $sqlInsert);
mysqli_stmt_bind_param($stmtInsert, "sssiiis", $cin, $immat, $date_test, $note_confort, $note_conduite, $note_securite, $commentaire);

if (!mysqli_stmt_execute($stmtInsert)) {
    echo "<p style='color: red;'>Erreur lors de l'enregistrement de l'évaluation : " . mysqli_error($conn) . "</p>";
    mysqli_close($conn);
    exit;
}

// 6. Calcul de la moyenne de ce test
$moyenneTest = ($note_confort + $note_conduite + $note_securite) / 3.0;

// 7. Requête d'agrégation multi-critères : moyenne globale et nombre d'essais pour ce véhicule
$sqlAggr = "SELECT 
                COUNT(*) AS total_essais,
                AVG(note_confort) AS moy_confort,
                AVG(note_conduite) AS moy_conduite,
                AVG(note_securite) AS moy_securite,
                AVG((note_confort + note_conduite + note_securite) / 3.0) AS moy_globale
            FROM evaluation
            WHERE immatriculation = ?";
$stmtAggr = mysqli_prepare($conn, $sqlAggr);
mysqli_stmt_bind_param($stmtAggr, "s", $immat);
mysqli_stmt_execute($stmtAggr);
$resAggr = mysqli_stmt_get_result($stmtAggr);
$stats = mysqli_fetch_assoc($resAggr);

// 8. Affichage du bilan complet
echo "<div style='font-family: Arial, sans-serif; max-width: 650px; margin: 30px auto; padding: 20px; border: 2px solid #b91c1c; border-radius: 8px; background-color: #fffaf0;'>";
echo "<h2 style='color: #b91c1c;'>Bilan de l'Évaluation Test Drive</h2>";
echo "<p><strong>Client :</strong> " . htmlspecialchars($client["prenom"] . " " . $client["nom"]) . " (CIN : " . htmlspecialchars($cin) . ")</p>";
echo "<p><strong>Véhicule :</strong> " . htmlspecialchars($voiture["marque"] . " " . $voiture["modele"]) . " [" . htmlspecialchars($immat) . "] (" . htmlspecialchars($voiture["energie"]) . ")</p>";
echo "<p><strong>Date de l'essai :</strong> " . htmlspecialchars($date_test) . "</p>";
echo "<hr style='border: none; border-top: 1px solid #fed7aa; margin: 15px 0;'>";
echo "<h3>Notes de l'essai actuel :</h3>";
echo "<ul>";
echo "<li>Confort : " . $note_confort . " / 5</li>";
echo "<li>Conduite : " . $note_conduite . " / 5</li>";
echo "<li>Sécurité : " . $note_securite . " / 5</li>";
echo "<li><strong>Score Moyen du Test : " . number_format($moyenneTest, 2) . " / 5</strong></li>";
echo "</ul>";
if (!empty($commentaire)) {
    echo "<p><em>Remarque client :</em> « " . htmlspecialchars($commentaire) . " »</p>";
}
echo "<hr style='border: none; border-top: 1px solid #fed7aa; margin: 15px 0;'>";
echo "<h3>Statistiques globales pour ce modèle :</h3>";
echo "<p>Nombre total d'essais réalisés : <strong>" . $stats["total_essais"] . "</strong></p>";
echo "<p>Moyenne globale historique : <strong>" . number_format($stats["moy_globale"], 2) . " / 5</strong> (Confort: " . number_format($stats["moy_confort"], 1) . ", Conduite: " . number_format($stats["moy_conduite"], 1) . ", Sécurité: " . number_format($stats["moy_securite"], 1) . ")</p>";
echo "</div>";

mysqli_close($conn);
?>
