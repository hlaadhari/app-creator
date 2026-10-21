/* Recherche de croisières : destination obligatoire, Date 1 > aujourd'hui, Date 2 > Date 1 */
function verif1() {
  let dest = document.getElementById("dest").value;
  let d1 = document.getElementById("DD").value;
  let d2 = document.getElementById("DF").value;

  if (dest == "") {
    alert("Veuillez sélectionner une destination");
    return false;
  }

  /* comparaison jour par jour : l'heure système est ramenée à minuit */
  let aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  /* "T00:00:00" force une lecture en heure locale (sans cela, "AAAA-MM-JJ" est lue en UTC) */
  if (d1 == "" || new Date(d1 + "T00:00:00") <= aujourdhui) {
    alert("La date 1 doit être strictement supérieure à la date du jour");
    return false;
  }
  if (d2 == "" || new Date(d2 + "T00:00:00") <= new Date(d1 + "T00:00:00")) {
    alert("La date 2 doit être strictement supérieure à la date 1");
    return false;
  }
  return true;
}

/* Affiche le nombre de places suivi de /10 */
function nombres() {
  document.getElementById("nb").textContent = document.getElementById("nbPlace").value + "/10";
}

/* Réservation : type d'identifiant, identifiant, nom et prénom */
function verif2() {
  let type = document.getElementById("typeId").value;
  let id = document.getElementById("idCl").value;
  let nom = document.getElementById("nomCl").value;

  if (type == "") {
    alert("Veuillez choisir le type d'identifiant");
    return false;
  }
  if (type == "Passeport" && !/^[A-Za-z][0-9]{9}$/.test(id)) {
    alert("Un passeport est formé d'une lettre suivie de 9 chiffres");
    return false;
  }
  if (type == "CIN" && !/^[0-9]{8}$/.test(id)) {
    alert("Un CIN est formé de 8 chiffres");
    return false;
  }

  /* lettres et espaces uniquement, au moins 7 lettres */
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/.test(nom) || nom.replace(/ /g, "").length < 7) {
    alert(
      "Le nom et prénom doit contenir uniquement des lettres et des espaces, avec au moins 7 lettres",
    );
    return false;
  }
  return true;
}
