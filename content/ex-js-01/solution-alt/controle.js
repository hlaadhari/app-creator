/**
 * Solution Alternative Valide - Exercice ex-js-01
 * Validation par Expression Régulière
 */

function verif() {
  const champ = document.getElementById("cin") || (document.f ? document.f.cin : null);
  if (!champ) return false;

  const cin = String(champ.value).trim();

  if (cin.length !== 8) {
    alert("Le CIN doit comporter exactement 8 chiffres.");
    if (champ.focus) champ.focus();
    return false;
  }

  if (!/^[0-9]{8}$/.test(cin)) {
    alert("Le CIN ne doit contenir que des chiffres décimaux (0 à 9).");
    if (champ.focus) champ.focus();
    return false;
  }

  return true;
}
