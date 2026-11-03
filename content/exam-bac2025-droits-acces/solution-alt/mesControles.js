function alpha(ch) {
  let cp = 0;
  ch = ch.toUpperCase();
  let valid = true;
  do {
    if ((ch[cp] >= "A" && ch[cp] <= "Z") || ch[cp] == " ") {
      cp = cp + 1;
    } else {
      valid = false;
    }
  } while (valid == true && cp < ch.length);
  return valid;
}

/* Ajout d'un utilisateur : identifiant "U" + 3 chiffres, nom et prénom alphabétiques (5 à 50 caractères) */
function verif1() {
  let id = document.getElementById("idUtil").value;
  let nom = document.getElementById("nomPrenom").value;

  if (!/^U[0-9]{3}$/.test(id)) {
    alert("Identifiant invalide : la lettre U suivie de 3 chiffres est attendue");
    return false;
  }
  if (nom.length < 5 || nom.length > 50 || !alpha(nom)) {
    alert("Nom et prénom invalides : 5 à 50 lettres alphabétiques ou espaces");
    return false;
  }
  return true;
}

/* Attribution des droits : un document et au moins un droit doivent être choisis */
function verif2() {
  let doc = document.getElementById("doc").value;
  let e = document.getElementById("ecriture").checked;
  let l = document.getElementById("lecture").checked;
  let i = document.getElementById("impression").checked;

  if (doc == "") {
    alert("Veuillez sélectionner un document");
    return false;
  }
  if (!e && !l && !i) {
    alert("Veuillez sélectionner au moins un droit d'accès");
    return false;
  }
  return true;
}

/* Ecriture cochée => Lecture cochée */
function choix1() {
  if (document.getElementById("ecriture").checked) {
    document.getElementById("lecture").checked = true;
  }
}

/* Lecture décochée => Ecriture et Impression décochées */
function choix2() {
  if (!document.getElementById("lecture").checked) {
    document.getElementById("ecriture").checked = false;
    document.getElementById("impression").checked = false;
  }
}

/* Impression cochée => Lecture cochée */
function choix3() {
  if (document.getElementById("impression").checked) {
    document.getElementById("lecture").checked = true;
  }
}
