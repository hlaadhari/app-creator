-- ==============================================================================
-- Base de données : Gestion_Exposition (Dynamik Expo)
-- Baccalauréat STI 2025 - Session principale (Épreuve Écrite Théorique)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Type_Manif` (
  `codeType` CHAR(3) PRIMARY KEY,
  `libType` VARCHAR(20) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS `Manifestation` (
  `codeManif` CHAR(5) PRIMARY KEY,
  `nomManif` VARCHAR(50) NOT NULL UNIQUE,
  `dateOuv` DATE NOT NULL,
  `dateFer` DATE NOT NULL,
  `codeType` CHAR(3) NOT NULL,
  FOREIGN KEY (`codeType`) REFERENCES `Type_Manif`(`codeType`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Halle` (
  `codeHalle` CHAR(3) PRIMARY KEY,
  `libHalle` VARCHAR(50) NOT NULL UNIQUE,
  `nbStandsMax` INT CHECK (`nbStandsMax` > 0)
);

CREATE TABLE IF NOT EXISTS `Stand` (
  `codeStand` CHAR(3) PRIMARY KEY,
  `designation` VARCHAR(50) NOT NULL,
  `superficie` INT CHECK (`superficie` BETWEEN 30 AND 100),
  `etat` CHAR(1) CHECK (`etat` IN ('L', 'O')),
  `codeHalle` CHAR(3) NOT NULL,
  FOREIGN KEY (`codeHalle`) REFERENCES `Halle`(`codeHalle`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Client` (
  `codeCl` CHAR(5) PRIMARY KEY,
  `nomCl` VARCHAR(50) NOT NULL,
  `telCl` CHAR(8) NOT NULL UNIQUE,
  `emailCl` VARCHAR(50) NOT NULL UNIQUE,
  `pays` VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Location` (
  `codeManif` CHAR(5) NOT NULL,
  `codeStand` CHAR(3) NOT NULL,
  `dateLoc` DATE NOT NULL,
  `prix` DECIMAL(8,2) NOT NULL CHECK (`prix` > 0),
  `codeCl` CHAR(5) NOT NULL,
  PRIMARY KEY (`codeManif`, `codeStand`),
  FOREIGN KEY (`codeManif`) REFERENCES `Manifestation`(`codeManif`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`codeStand`) REFERENCES `Stand`(`codeStand`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`codeCl`) REFERENCES `Client`(`codeCl`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Evaluation` (
  `codeEval` INT AUTO_INCREMENT PRIMARY KEY,
  `dateEval` DATE NOT NULL,
  `noteAccueil` INT CHECK (`noteAccueil` BETWEEN 0 AND 5),
  `noteConfort` INT CHECK (`noteConfort` BETWEEN 0 AND 5),
  `noteSignal` INT CHECK (`noteSignal` BETWEEN 0 AND 5),
  `noteLogistique` INT CHECK (`noteLogistique` BETWEEN 0 AND 5),
  `codeManif` CHAR(5) NOT NULL,
  FOREIGN KEY (`codeManif`) REFERENCES `Manifestation`(`codeManif`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Type_Manif` VALUES ('T01', 'Foire'), ('T02', 'Salon'), ('T03', 'Séminaire');
INSERT INTO `Manifestation` VALUES ('M0001', 'Foire du livre', '2025-03-10', '2025-03-22', 'T01'), ('M0002', 'Salon de l''Art', '2025-04-02', '2025-04-05', 'T02'), ('M0003', 'Séminaire des médecins', '2025-05-14', '2025-05-16', 'T03'), ('M0004', 'Foire de l''artisanat', '2024-10-01', '2024-10-10', 'T01');
INSERT INTO `Halle` VALUES ('H01', 'Halle A', 10), ('H02', 'Halle B', 8);
INSERT INTO `Stand` VALUES ('S01', 'Stand Alpha', 40, 'L', 'H01'), ('S02', 'Stand Beta', 60, 'L', 'H01'), ('S03', 'Stand Gamma', 85, 'L', 'H01'), ('S04', 'Stand Delta', 50, 'O', 'H01'), ('S05', 'Stand Epsilon', 70, 'L', 'H02'), ('S06', 'Stand Zeta', 35, 'O', 'H02'), ('S07', 'Stand Eta', 90, 'L', 'H02');
INSERT INTO `Client` VALUES ('C0001', 'Ali ABIDI', '33556677', 'Ali.ABIDI@gmail.com', 'Tunisie'), ('C0002', 'Sonia Gharbi', '22334455', 'sonia.gharbi@mail.tn', 'Tunisie'), ('C0003', 'Pierre Martin', '44556677', 'pierre.martin@mail.fr', 'France'), ('C0004', 'Leila Trabelsi', '55667788', 'leila.trabelsi@mail.tn', 'Tunisie');
INSERT INTO `Location` VALUES ('M0001', 'S01', '2025-02-20', 3000.00, 'C0001'), ('M0001', 'S02', '2025-02-21', 4000.00, 'C0002'), ('M0001', 'S03', '2025-02-25', 5200.00, 'C0001'), ('M0002', 'S05', '2025-03-15', 2500.00, 'C0003'), ('M0002', 'S07', '2025-03-20', 3500.00, 'C0001'), ('M0003', 'S01', '2025-04-30', 1800.00, 'C0002'), ('M0004', 'S02', '2024-09-01', 3000.00, 'C0003'), ('M0004', 'S04', '2024-09-05', 2000.00, 'C0002');
INSERT INTO `Evaluation` VALUES (1, '2025-03-15', 4, 3, 5, 4, 'M0001'), (2, '2025-04-04', 5, 4, 4, 3, 'M0002');
