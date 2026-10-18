/**
 * Corrigé officiel - Exercice tp-fs-01
 * Fonctions de calcul dynamique et de validation du formulaire de don
 */

const PRIX_ARTICLES = {
  Ordinateur: 800,
  "Imprimante 3D": 1200,
  "Casque VR": 500,
  "Carte Microcontrôleur": 60,
};

function calculerMontant() {
  const selArticle = document.getElementById("article");
  const qteInput = document.getElementById("qte");
  const montantInput = document.getElementById("montant");

  if (!selArticle || !qteInput || !montantInput) return;

  const articleChoisi = selArticle.value;
  const qte = parseInt(qteInput.value, 10);

  if (!articleChoisi || isNaN(qte) || qte <= 0) {
    montantInput.value = "0.00";
    return;
  }

  const prixUnitaire = PRIX_ARTICLES[articleChoisi] || 0;
  const total = prixUnitaire * qte;
  montantInput.value = total.toFixed(2);
}

function test1() {
  const nom = document.getElementById("nom")?.value.trim() || "";
  const lycee = document.getElementById("lycee")?.value || "";
  const article = document.getElementById("article")?.value || "";
  const qte = parseInt(document.getElementById("qte")?.value || "0", 10);

  // 1. Nom obligatoire (au moins 3 caractères)
  if (nom.length < 3) {
    alert("Veuillez saisir un nom de donateur valide (au moins 3 caractères).");
    document.getElementById("nom")?.focus();
    return false;
  }

  // 2. Type de donateur (au moins un bouton radio coché)
  const radios = document.getElementsByName("type_user");
  let typeCoche = false;
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      typeCoche = true;
      break;
    }
  }
  if (!typeCoche) {
    alert("Veuillez sélectionner votre profil donateur.");
    return false;
  }

  // 3. Lycée et article
  if (!lycee) {
    alert("Veuillez sélectionner le lycée bénéficiaire.");
    document.getElementById("lycee")?.focus();
    return false;
  }

  if (!article) {
    alert("Veuillez sélectionner un article à offrir.");
    document.getElementById("article")?.focus();
    return false;
  }

  // 4. Quantité
  if (isNaN(qte) || qte <= 0) {
    alert("La quantité doit être un nombre entier positif supérieur à 0.");
    document.getElementById("qte")?.focus();
    return false;
  }

  return true;
}
