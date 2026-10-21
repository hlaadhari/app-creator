/* la fonction "nettoyage" permet d’effacer les espaces de début et de fin
ainsi que les espaces superflus de la chaîne ch */
function nettoyage(ch)
{
  ch = ch.trim()
  while(ch.indexOf("  ") != -1 )
   {
     ch = ch.replace("  ", " ")    /* remplacer deux espaces par une seule espace */
   }
  return ch
}

/* Identifiant d'un bijou : deux lettres alphabétiques suivies de trois chiffres */
function idValide(id)
{
  return /^[A-Za-z]{2}[0-9]{3}$/.test(id)
}

/* Ajout d'un bijou */
function valide1()
{
  let id = document.getElementById("idBij").value
  let prix = document.getElementById("prix").value
  let compo = document.getElementById("composition")
  let nbMetaux = 0

  if (document.getElementById("c1").checked) nbMetaux++
  if (document.getElementById("c2").checked) nbMetaux++
  if (document.getElementById("c3").checked) nbMetaux++

  /* arrière-plan rouge tant que la composition est invalide */
  compo.style.backgroundColor = (nbMetaux == 0) ? "red" : ""

  if (!idValide(id))
  {
    alert("Identifiant invalide : deux lettres suivies de trois chiffres")
    return false
  }
  if (prix === "" || isNaN(prix) || Number(prix) < 100)
  {
    alert("Le prix de vente doit être supérieur ou égal à 100")
    return false
  }
  if (nbMetaux == 0)
  {
    alert("Veuillez sélectionner au moins un métal")
    return false
  }
  return true
}

/* Evaluation d'un bijou */
function valide2()
{
  let id = document.getElementById("idBij").value
  let expert = document.getElementById("expert").value
  let finition = document.getElementById("finition").value
  let originalite = document.getElementById("oui").checked || document.getElementById("non").checked
  let commentaire = nettoyage(document.getElementById("commentaire").value)

  if (!idValide(id))
  {
    alert("Identifiant invalide : deux lettres suivies de trois chiffres")
    return false
  }
  if (expert == "")
  {
    alert("Veuillez sélectionner un expert")
    return false
  }
  if (!/^[0-9]+$/.test(finition) || Number(finition) < 1 || Number(finition) > 5)
  {
    alert("La finition doit être un entier compris entre 1 et 5")
    return false
  }
  if (!originalite)
  {
    alert("Veuillez préciser l'originalité du bijou")
    return false
  }

  let mots = commentaire.split(" ")
  if (mots.length < 2)
  {
    alert("Le commentaire doit contenir au moins deux mots")
    return false
  }
  for (let i = 0; i < mots.length; i++)
  {
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]+$/.test(mots[i]))
    {
      alert("Chaque mot du commentaire doit être formé uniquement de lettres")
      return false
    }
  }
  return true
}
