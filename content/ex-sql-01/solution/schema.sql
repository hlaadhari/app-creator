-- ==============================================================================
-- Corrigé officiel - Exercice ex-sql-01
-- ==============================================================================

-- Table parente fournie
CREATE TABLE capteur (
  id_capteur INT AUTO_INCREMENT PRIMARY KEY,
  designation VARCHAR(50) NOT NULL,
  salle VARCHAR(20) NOT NULL
);

-- Table enfant mesure
CREATE TABLE mesure (
  id_mesure INT AUTO_INCREMENT PRIMARY KEY,
  id_capteur INT NOT NULL,
  valeur DECIMAL(6,2) NOT NULL,
  date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mesure_capteur FOREIGN KEY (id_capteur) REFERENCES capteur(id_capteur),
  CONSTRAINT chk_valeur_domaine CHECK (valeur >= -50 AND valeur <= 150)
);
