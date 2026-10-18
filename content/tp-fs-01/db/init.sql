-- ==============================================================================
-- Initialisation Base de Données - TP Formulaire de Don (tp-fs-01)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS don (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(60) NOT NULL,
  type_user VARCHAR(30) NOT NULL,
  lycee VARCHAR(60) NOT NULL,
  article VARCHAR(50) NOT NULL,
  qte INT NOT NULL CHECK (qte > 0),
  montant DECIMAL(10,2) NOT NULL CHECK (montant > 0),
  date_don DATETIME DEFAULT CURRENT_TIMESTAMP
);
