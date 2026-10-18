/**
 * Corrigé officiel - Exercice tp-fs-02
 * Contrôle de sélection et de date
 */

function test2() {
  const stationSel = document.getElementById("station");
  const anneeInput = document.getElementById("annee");

  if (!stationSel || !anneeInput) return false;

  const stationVal = stationSel.value.trim();
  const anneeVal = parseInt(anneeInput.value, 10);

  // 1. Contrôle sélection de la station
  if (!stationVal || stationVal === "") {
    alert("Veuillez sélectionner une station météo dans la liste.");
    stationSel.focus();
    return false;
  }

  // 2. Contrôle de l'année (entre 2020 et 2026)
  if (isNaN(anneeVal) || anneeVal < 2020 || anneeVal > 2026) {
    alert("L'année d'observation doit être comprise entre 2020 et 2026.");
    anneeInput.focus();
    return false;
  }

  return true;
}
