<?php
/**
 * Corrigé officiel - Exercice tp-fs-01
 * Enregistrement du don dans la base de données relationnelle
 */

// 1. Connexion au serveur MySQL
$cnx = mysqli_connect("localhost", "root", "", "labo_db");

if (!$cnx) {
    die("Échec de connexion à la base de données : " . mysqli_connect_error());
}

// 2. Vérification de la méthode de requête
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    die("Méthode non autorisée.");
}

// 3. Récupération et nettoyage des données POST
$nom = isset($_POST["nom"]) ? trim(mysqli_real_escape_string($cnx, $_POST["nom"])) : "";
$type_user = isset($_POST["type_user"]) ? trim(mysqli_real_escape_string($cnx, $_POST["type_user"])) : "";
$lycee = isset($_POST["lycee"]) ? trim(mysqli_real_escape_string($cnx, $_POST["lycee"])) : "";
$article = isset($_POST["article"]) ? trim(mysqli_real_escape_string($cnx, $_POST["article"])) : "";
$qte = isset($_POST["qte"]) ? intval($_POST["qte"]) : 0;
$montant = isset($_POST["montant"]) ? floatval($_POST["montant"]) : 0.0;

// Grille de prix pour recalcul serveur sécurisé
$prix_catalogue = [
    "Ordinateur" => 800.0,
    "Imprimante 3D" => 1200.0,
    "Casque VR" => 500.0,
    "Carte Microcontrôleur" => 60.0
];

if (empty($nom) || empty($type_user) || empty($lycee) || empty($article) || $qte <= 0) {
    die("Données du formulaire incomplètes ou invalides.");
}

// Calcul du montant officiel côté serveur
$prix_unitaire = isset($prix_catalogue[$article]) ? $prix_catalogue[$article] : 0.0;
$montant_calcule = $prix_unitaire * $qte;

// 4. Requête d'insertion SQL
$sql = "INSERT INTO don (nom, type_user, lycee, article, qte, montant) 
        VALUES ('$nom', '$type_user', '$lycee', '$article', $qte, $montant_calcule)";

$res = mysqli_query($cnx, $sql);

if ($res) {
    echo "<!DOCTYPE html>";
    echo "<html lang='fr'><head><meta charset='UTF-8'><title>Confirmation de Don</title>";
    echo "<link rel='stylesheet' href='mesStyles.css'></head><body>";
    echo "<div id='fDon' style='padding: 24px; text-align: center;'>";
    echo "<h2 style='color: #0066cc;'>Merci pour votre don !</h2>";
    echo "<p>Votre soutien en faveur du <strong>" . htmlspecialchars($lycee) . "</strong> a été enregistré avec succès.</p>";
    echo "<p>Matériel : <strong>" . $qte . " x " . htmlspecialchars($article) . "</strong></p>";
    echo "<p>Montant total estimé : <strong>" . number_format($montant_calcule, 2) . " DT</strong></p>";
    echo "<p><a href='Don.html' style='color: #0066cc;'>Effectuer un autre don</a></p>";
    echo "</div></body></html>";
} else {
    echo "Erreur lors de l'enregistrement : " . mysqli_error($cnx);
}

mysqli_close($cnx);
?>
