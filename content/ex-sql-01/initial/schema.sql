-- ==============================================================================
-- Schéma Relationnel : Laboratoire STI
-- ==============================================================================

-- Table parente fournie
CREATE TABLE capteur (
  id_capteur INT AUTO_INCREMENT PRIMARY KEY,
  designation VARCHAR(50) NOT NULL,
  salle VARCHAR(20) NOT NULL
);

-- Écrivez ci-dessous l'instruction CREATE TABLE pour la table 'mesure'
-- conformément aux consignes (clé primaire, clé étrangère et contrainte CHECK).
