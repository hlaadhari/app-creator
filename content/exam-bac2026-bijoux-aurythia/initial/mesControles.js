/* la fonction "nettoyage" permet d’effacer les espaces de début et de fin
ainsi que les espaces superflus de la chaîne ch */
function nettoyage(ch) {
  ch = ch.trim();
  while (ch.indexOf("  ") != -1) {
    ch = ch.replace("  ", " "); /* remplacer deux espaces par une seule espace */
  }
  return ch;
}
