/**
 * Solution Alternative Valide - TP Météo (tp-fs-02)
 */

function test2() {
  const station = document.getElementById("station")?.value;
  const annee = parseInt(document.getElementById("annee")?.value || "0", 10);

  if (!station) {
    alert("Veuillez sélectionner une station météo.");
    return false;
  }

  if (isNaN(annee) || annee < 2020 || annee > 2026) {
    alert("L'année doit être comprise entre 2020 et 2026.");
    return false;
  }

  return true;
}
