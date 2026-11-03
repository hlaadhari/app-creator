-- ==============================================================================
-- Solution Invalide - Exercice ex-sql-01
-- Omet la clé étrangère, la contrainte CHECK et les contraintes NOT NULL
-- ==============================================================================

CREATE TABLE capteur (
  id_capteur INT PRIMARY KEY,
  designation VARCHAR(50),
  salle VARCHAR(20)
);

CREATE TABLE mesure (
  id_mesure INT,
  id_capteur INT,
  valeur DECIMAL(6,2)
);
