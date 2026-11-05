-- =============================================================================
-- Base de Données Officielle : bd_bac2023_controle (SeismicSTAT)
-- Baccalauréat 2023 - Session de Contrôle (Section Sciences de l'Informatique)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `Pays` (
  `codePays` VARCHAR(3) PRIMARY KEY,
  `nomPays` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Ville` (
  `codeVille` VARCHAR(10) PRIMARY KEY,
  `nomVille` VARCHAR(30) NOT NULL,
  `codePays` VARCHAR(3),
  FOREIGN KEY (`codePays`) REFERENCES `Pays`(`codePays`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `LieuSeisme` (
  `codeLieu` VARCHAR(10) PRIMARY KEY,
  `latitude` DECIMAL(8,5) NOT NULL,
  `longitude` DECIMAL(8,5) NOT NULL,
  `codeVille` VARCHAR(10),
  FOREIGN KEY (`codeVille`) REFERENCES `Ville`(`codeVille`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Seisme` (
  `dateSeisme` DATE NOT NULL,
  `codeLieu` VARCHAR(10) NOT NULL,
  `magnitude` DECIMAL(3,1) NOT NULL CHECK (`magnitude` >= 0 AND `magnitude` <= 10),
  PRIMARY KEY (`dateSeisme`, `codeLieu`),
  FOREIGN KEY (`codeLieu`) REFERENCES `LieuSeisme`(`codeLieu`) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Données initiales de l'épreuve
INSERT INTO `Pays` VALUES ('TUN', 'Tunisie'), ('IDN', 'Indonésie'), ('TUR', 'Turquie');
INSERT INTO `Ville` VALUES 
  ('AFN324', 'Tunis', 'TUN'), 
  ('IDN', 'Jakarta', 'IDN'), 
  ('IDN02', 'Palu', 'IDN'), 
  ('TUR01', 'Gaziantep', 'TUR');
INSERT INTO `LieuSeisme` VALUES 
  ('L01', 36.8065, 10.1815, 'AFN324'),
  ('L02', -0.7893, 113.9213, 'IDN'),
  ('L03', 36.8100, 10.1900, 'AFN324'),
  ('ZGP123', 37.0660, 52.1200, 'TUR01');
INSERT INTO `Seisme` VALUES 
  ('2023-01-15', 'L01', 5.4),
  ('2022-03-22', 'L02', 7.1),
  ('2022-05-10', 'L02', 6.5),
  ('2022-07-14', 'L02', 6.2),
  ('2023-05-10', 'L03', 4.2),
  ('2021-11-02', 'L01', 3.2),
  ('2023-02-06', 'ZGP123', 7.8);
