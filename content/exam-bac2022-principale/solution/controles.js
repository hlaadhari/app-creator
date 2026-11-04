function verif() {
  const cinInput = document.getElementById("cin");
  const nomInput = document.getElementById("nom");
  const prenomInput = document.getElementById("prenom");
  const telInput = document.getElementById("tel");

  const cin = cinInput ? cinInput.value.trim() : "";
  const nom = nomInput ? nomInput.value.trim() : "";
  const prenom = prenomInput ? prenomInput.value.trim() : "";
  const tel = telInput ? telInput.value.trim() : "";

  // Contrôle CIN : exactement 8 chiffres
  if (cin.length !== 8 || isNaN(cin)) {
    alert("Le numéro de CIN doit comporter exactement 8 chiffres.");
    return false;
  }

  // Contrôle Nom et Prénom non vides
  if (nom === "") {
    alert("Veuillez saisir le nom de l'élève.");
    return false;
  }

  if (prenom === "") {
    alert("Veuillez saisir le prénom de l'élève.");
    return false;
  }

  // Contrôle Téléphone : exactement 8 chiffres
  if (tel.length !== 8 || isNaN(tel)) {
    alert("Le numéro de téléphone doit comporter exactement 8 chiffres.");
    return false;
  }

  return true;
}
