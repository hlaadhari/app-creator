-- ==============================================================================
-- Solution Alternative Valide - Exercice ex-sql-01
-- Déclaration des contraintes au niveau de la table (syntaxe ANSI standard)
-- ==============================================================================

CREATE TABLE capteur (
  id_capteur INT AUTO_INCREMENT,
  designation VARCHAR(50) NOT NULL,
  salle VARCHAR(20) NOT NULL,
  PRIMARY KEY (id_capteur)
);

CREATE TABLE mesure (
  id_mesure INT AUTO_INCREMENT,
  id_capteur INT NOT NULL,
  valeur DECIMAL(6,2) NOT NULL,
  date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_mesure),
  FOREIGN KEY (id_capteur) REFERENCES capteur(id_capteur) ON DELETE CASCADE,
  CHECK (valeur BETWEEN -50 AND 150)
);
