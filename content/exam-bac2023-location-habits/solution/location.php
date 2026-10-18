<?php
/**
 * Bac STI 2023 - Enregistrement d'une location d'habit traditionnel
 * Script solution complet
 */

// 1. Paramètres de connexion
$host = "localhost";
$user = "root";
$pass = "";
$db   = "bd2023";

$conn = mysqli_connect($host, $user, $pass, $db);
if (!$conn) {
    die("<p style='color: red;'>Erreur critique : Impossible de se connecter à la base bd2023 (" . mysqli_connect_error() . ")</p>");
}

// 2. Vérification et extraction des paramètres POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    die("<p style='color: red;'>Méthode de requête non autorisée.</p>");
}

$cin      = isset($_POST["cin"]) ? trim($_POST["cin"]) : "";
$id_habit = isset($_POST["id_habit"]) ? intval($_POST["id_habit"]) : 0;
$date_loc = isset($_POST["date_loc"]) ? trim($_POST["date_loc"]) : "";
$duree    = isset($_POST["duree"]) ? intval($_POST["duree"]) : 0;

// Validation des données reçues
if (strlen($cin) !== 8 || !is_numeric($cin) || $id_habit <= 0 || empty($date_loc) || $duree <= 0) {
    die("<p style='color: red;'>Données de formulaire invalides ou incomplètes.</p>");
}

// 3. Vérification de l'existence du client
$sqlClient = "SELECT cin, nom, prenom FROM client WHERE cin = ?";
$stmtClient = mysqli_prepare($conn, $sqlClient);
mysqli_stmt_bind_param($stmtClient, "s", $cin);
mysqli_stmt_execute($stmtClient);
$resClient = mysqli_stmt_get_result($stmtClient);

if (mysqli_num_rows($resClient) === 0) {
    echo "<p style='color: orange;'>Client avec CIN <strong>" . htmlspecialchars($cin) . "</strong> introuvable. Veuillez d'abord enregistrer le client.</p>";
    mysqli_close($conn);
    exit;
}

$clientData = mysqli_fetch_assoc($resClient);

// 4. Vérification de la disponibilité de l'habit
$sqlHabit = "SELECT id_habit, description, taille, prix_jour, disponible FROM habit WHERE id_habit = ?";
$stmtHabit = mysqli_prepare($conn, $sqlHabit);
mysqli_stmt_bind_param($stmtHabit, "i", $id_habit);
mysqli_stmt_execute($stmtHabit);
$resHabit = mysqli_stmt_get_result($stmtHabit);

if (mysqli_num_rows($resHabit) === 0) {
    echo "<p style='color: red;'>Habit sélectionné introuvable dans la base.</p>";
    mysqli_close($conn);
    exit;
}

$habitData = mysqli_fetch_assoc($resHabit);

if ($habitData["disponible"] !== "O") {
    echo "<p style='color: red;'>L'habit <em>" . htmlspecialchars($habitData["description"]) . "</em> est actuellement indisponible (déjà loué).</p>";
    mysqli_close($conn);
    exit;
}

// 5. Enregistrement de la location
$sqlInsert = "INSERT INTO location (cin, id_habit, date_loc, duree) VALUES (?, ?, ?, ?)";
$stmtInsert = mysqli_prepare($conn, $sqlInsert);
mysqli_stmt_bind_param($stmtInsert, "sisi", $cin, $id_habit, $date_loc, $duree);

if (!mysqli_stmt_execute($stmtInsert)) {
    echo "<p style='color: red;'>Erreur lors de l'enregistrement de la location : " . mysqli_error($conn) . "</p>";
    mysqli_close($conn);
    exit;
}

// 6. Mise à jour de la disponibilité de l'habit (disponible = 'N')
$sqlUpdate = "UPDATE habit SET disponible = 'N' WHERE id_habit = ?";
$stmtUpdate = mysqli_prepare($conn, $sqlUpdate);
mysqli_stmt_bind_param($stmtUpdate, "i", $id_habit);
mysqli_stmt_execute($stmtUpdate);

$montantTotal = $habitData["prix_jour"] * $duree;

echo "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px; border: 2px solid #27ae60; border-radius: 8px; background-color: #eafaf1;'>";
echo "<h2 style='color: #27ae60;'>Location Enregistrée avec Succès !</h2>";
echo "<p><strong>Client :</strong> " . htmlspecialchars($clientData["prenom"] . " " . $clientData["nom"]) . " (CIN : " . htmlspecialchars($cin) . ")</p>";
echo "<p><strong>Habit :</strong> " . htmlspecialchars($habitData["description"]) . " (Taille : " . htmlspecialchars($habitData["taille"]) . ")</p>";
echo "<p><strong>Date de début :</strong> " . htmlspecialchars($dateLoc ?? $date_loc) . "</p>";
echo "<p><strong>Durée :</strong> " . $duree . " jour(s)</p>";
echo "<p><strong>Montant Total Estimé :</strong> " . number_format($montantTotal, 2) . " DT</p>";
echo "</div>";

mysqli_close($conn);
?>
