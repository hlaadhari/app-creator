/**
 * Bac STI 2018 - Contrôle du formulaire Test Drive
 * Fonction test() conforme au barème officiel
 */
function test() {
  const cinInput = document.getElementById("cin");
  const immSelect = document.getElementById("immatriculation");
  const dateInput = document.getElementById("date_test");
  const confInput = document.getElementById("note_confort");
  const condInput = document.getElementById("note_conduite");
  const secInput = document.getElementById("note_securite");

  const cin = cinInput ? cinInput.value.trim() : "";
  const imm = immSelect ? immSelect.value : "";
  const dateTest = dateInput ? dateInput.value.trim() : "";
  const conf = confInput ? parseInt(confInput.value.trim(), 10) : 0;
  const cond = condInput ? parseInt(condInput.value.trim(), 10) : 0;
  const sec = secInput ? parseInt(secInput.value.trim(), 10) : 0;

  // 1. Contrôle du numéro CIN (8 chiffres obligatoires)
  if (cin.length !== 8 || isNaN(cin) || !/^\d{8}$/.test(cin)) {
    alert("Le numéro de CIN doit comporter exactement 8 chiffres.");
    if (cinInput) cinInput.focus();
    return false;
  }

  // 2. Contrôle de la sélection de la voiture
  if (imm === "") {
    alert("Veuillez sélectionner un véhicule dans la liste.");
    if (immSelect) immSelect.focus();
    return false;
  }

  // 3. Contrôle de la date de l'essai
  if (dateTest === "") {
    alert("Veuillez renseigner la date de l'essai.");
    if (dateInput) dateInput.focus();
    return false;
  }

  // 4. Contrôle des notes (confort, conduite, sécurité entre 1 et 5)
  if (isNaN(conf) || conf < 1 || conf > 5) {
    alert("La note de confort doit être un nombre entier compris entre 1 et 5.");
    if (confInput) confInput.focus();
    return false;
  }

  if (isNaN(cond) || cond < 1 || cond > 5) {
    alert("La note de conduite doit être un nombre entier compris entre 1 et 5.");
    if (condInput) condInput.focus();
    return false;
  }

  if (isNaN(sec) || sec < 1 || sec > 5) {
    alert("La note de sécurité doit être un nombre entier compris entre 1 et 5.");
    if (secInput) secInput.focus();
    return false;
  }

  return true;
}
