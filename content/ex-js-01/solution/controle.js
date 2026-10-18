/**
 * Corrigé officiel - Exercice ex-js-01
 * Validation du champ CIN (8 chiffres stricts)
 */

function verif() {
  const champCin = document.getElementById("cin") || (document.f ? document.f.cin : null);
  if (!champCin) return false;

  const valeur = String(champCin.value).trim();

  // Contrôle de longueur
  if (valeur.length !== 8) {
    alert("Le CIN doit comporter exactement 8 chiffres.");
    if (champCin.focus) champCin.focus();
    return false;
  }

  // Contrôle numérique strict (expression régulière ou test caractère par caractère)
  for (let i = 0; i < valeur.length; i++) {
    const c = valeur.charAt(i);
    if (c < "0" || c > "9") {
      alert("Le CIN ne doit contenir que des chiffres décimaux (0 à 9).");
      if (champCin.focus) champCin.focus();
      return false;
    }
  }

  return true;
}
