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
