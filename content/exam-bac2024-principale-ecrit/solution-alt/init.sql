-- ==============================================================================
-- Base de Données Officielle : Gestion_Barrage (Smart Water)
-- Baccalauréat STI 2024 - Session Principale (Épreuve Écrite Théorique)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Barrage` (
  `idBar` INT PRIMARY KEY,
  `nomBar` VARCHAR(40) NOT NULL,
  `volume` DECIMAL(10,2) NOT NULL,
  `hauteur` DECIMAL(6,2) NOT NULL,
  `superficie` DECIMAL(8,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS `NiveauEau` (
  `dateNiv` DATETIME NOT NULL,
  `idBar` INT NOT NULL,
  `niveau` DECIMAL(6,2) NOT NULL,
  PRIMARY KEY (`dateNiv`, `idBar`),
  FOREIGN KEY (`idBar`) REFERENCES `Barrage`(`idBar`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Vanne` (
  `idVan` INT PRIMARY KEY,
  `etatVan` TINYINT(1) NOT NULL DEFAULT 0,
  `idBar` INT,
  FOREIGN KEY (`idBar`) REFERENCES `Barrage`(`idBar`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Capteur` (
  `idCapt` INT PRIMARY KEY,
  `refCapt` VARCHAR(30) NOT NULL UNIQUE,
  `idVan` INT,
  FOREIGN KEY (`idVan`) REFERENCES `Vanne`(`idVan`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Mesure` (
  `idMes` INT PRIMARY KEY,
  `valMes` DECIMAL(8,2) NOT NULL,
  `dateMes` DATETIME NOT NULL,
  `idCapt` INT,
  FOREIGN KEY (`idCapt`) REFERENCES `Capteur`(`idCapt`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Alerte` (
  `idAlert` INT PRIMARY KEY,
  `degAlert` INT NOT NULL CHECK (`degAlert` IN (1, 2, 3)),
  `statAlert` CHAR(1) NOT NULL,
  `idMes` INT,
  FOREIGN KEY (`idMes`) REFERENCES `Mesure`(`idMes`) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Données initiales conformes au sujet d'examen
INSERT INTO `Barrage` VALUES 
  (1, 'Sidi Salem', 555.00, 57.00, 4300.00),
  (2, 'Bou Heurtma', 112.00, 42.00, 850.00),
  (3, 'Joumine', 118.00, 38.00, 780.00),
  (5, 'Sejnane', 134.00, 45.00, 1100.00);

INSERT INTO `NiveauEau` VALUES 
  ('2024-05-10 08:00:00', 1, 52.50),
  ('2024-05-12 09:30:00', 2, 25.00),
  ('2024-05-15 11:00:00', 5, 41.50);

INSERT INTO `Vanne` VALUES 
  (101, 1, 1),
  (102, 0, 2),
  (103, 1, 1),
  (104, 0, 3),
  (105, 1, 5),
  (106, 0, 5);

INSERT INTO `Capteur` VALUES 
  (1, 'CapteurDeFlux-500', 101),
  (2, 'AquaSense-2000', 102),
  (3, 'DeltaNiveau-2000', 103),
  (4, 'SmartFlowMeter-600', 104),
  (5, 'DébitMètre-800', 102);

INSERT INTO `Mesure` VALUES 
  (1, 14.50, '2024-01-30 08:00:00', 4),
  (2, 16.00, '2024-02-01 12:00:00', 4),
  (3, 8.20, '2024-02-10 10:15:00', 1),
  (4, 25.00, '2024-03-01 09:00:00', 3);

INSERT INTO `Alerte` VALUES 
  (10, 3, 'A', 3),
  (11, 1, 'R', 1),
  (12, 2, 'E', 2);
