/**
 * Solution Alternative Valide - Exercice tp-fs-01
 */

function calculerMontant() {
  const art = document.getElementById("article")?.value;
  const qte = parseInt(document.getElementById("qte")?.value || "0", 10);
  const m = document.getElementById("montant");
  if (!m) return;

  let pu = 0;
  if (art === "Ordinateur") pu = 800;
  else if (art === "Imprimante 3D") pu = 1200;
  else if (art === "Casque VR") pu = 500;
  else if (art === "Carte Microcontrôleur") pu = 60;

  m.value = (pu * (qte > 0 ? qte : 0)).toFixed(2);
}

function test1() {
  const nom = (document.getElementById("nom")?.value || "").trim();
  const lycee = document.getElementById("lycee")?.value || "";
  const article = document.getElementById("article")?.value || "";
  const qte = parseInt(document.getElementById("qte")?.value || "0", 10);

  if (nom.length < 3) {
    alert("Nom invalide");
    return false;
  }

  const radios = Array.from(document.querySelectorAll('input[name="type_user"]'));
  if (radios.length > 0 && !radios.some((r) => r.checked)) {
    radios[0].checked = true;
  }

  if (!lycee || !article || isNaN(qte) || qte <= 0) {
    alert("Champs obligatoires manquants");
    return false;
  }

  return true;
}
