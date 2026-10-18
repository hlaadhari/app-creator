/**
 * Bac STI 2023 - Contrôle du formulaire de location d'habits
 * Fonction verif2() conforme au barème officiel
 */
function verif2() {
  const cinInput = document.getElementById("cin");
  const habitSelect = document.getElementById("id_habit");
  const dateInput = document.getElementById("date_loc");
  const dureeInput = document.getElementById("duree");

  const cin = cinInput ? cinInput.value.trim() : "";
  const idHabit = habitSelect ? habitSelect.value : "";
  const dateLoc = dateInput ? dateInput.value.trim() : "";
  const dureeVal = dureeInput ? dureeInput.value.trim() : "";

  // 1. Contrôle du numéro CIN (exactement 8 chiffres)
  if (cin.length !== 8 || isNaN(cin) || !/^\d{8}$/.test(cin)) {
    alert("Le numéro de CIN doit être obligatoirement composé de 8 chiffres.");
    if (cinInput) cinInput.focus();
    return false;
  }

  // 2. Contrôle de la sélection de l'habit
  if (idHabit === "" || idHabit === "0") {
    alert("Veuillez sélectionner un habit dans la liste déroulante.");
    if (habitSelect) habitSelect.focus();
    return false;
  }

  // 3. Contrôle de la date de location
  if (dateLoc === "") {
    alert("Veuillez renseigner la date de location.");
    if (dateInput) dateInput.focus();
    return false;
  }

  // 4. Contrôle de la durée (strictement supérieure à zéro)
  const duree = parseInt(dureeVal, 10);
  if (isNaN(duree) || duree <= 0) {
    alert("La durée de location doit être un nombre entier strictement positif.");
    if (dureeInput) dureeInput.focus();
    return false;
  }

  return true;
}
