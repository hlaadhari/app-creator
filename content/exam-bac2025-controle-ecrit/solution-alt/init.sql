-- ==============================================================================
-- Base de données : Gestion_Incendies (GeoIncendie)
-- Baccalauréat STI 2025 - Session de contrôle (Épreuve Écrite Théorique)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `Gouvernorat` (
  `codeGouv` CHAR(3) PRIMARY KEY,
  `nomGouv` VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS `Ville` (
  `codeVille` CHAR(5) PRIMARY KEY,
  `nomVille` VARCHAR(50) NOT NULL,
  `nbForet` INT CHECK (`nbForet` > 0),
  `codeGouv` CHAR(3) NOT NULL,
  FOREIGN KEY (`codeGouv`) REFERENCES `Gouvernorat`(`codeGouv`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Foret` (
  `codeForet` CHAR(6) PRIMARY KEY,
  `nomForet` VARCHAR(50) NOT NULL,
  `superficieForet` DECIMAL(10,3) NOT NULL CHECK (`superficieForet` > 0),
  `codeVille` CHAR(5) NOT NULL,
  FOREIGN KEY (`codeVille`) REFERENCES `Ville`(`codeVille`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Incendie` (
  `codeInc` CHAR(10) PRIMARY KEY,
  `dateHeureInc` DATETIME NOT NULL,
  `superficieBrulee` DECIMAL(10,3) NOT NULL CHECK (`superficieBrulee` > 0),
  `statutInc` CHAR(1) DEFAULT 'A' CHECK (`statutInc` IN ('A', 'E')),
  `dateHeureExt` DATETIME NULL,
  `codeForet` CHAR(6) NOT NULL,
  FOREIGN KEY (`codeForet`) REFERENCES `Foret`(`codeForet`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `TypeIntervention` (
  `codeTypeInt` CHAR(3) PRIMARY KEY,
  `description` VARCHAR(9) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Intervention` (
  `codeInt` CHAR(10) PRIMARY KEY,
  `dateHeureDebInt` DATETIME NOT NULL,
  `dateHeureFinInt` DATETIME NULL,
  `superficieInt` DECIMAL(10,3) DEFAULT 0 CHECK (`superficieInt` >= 0),
  `codeTypeInt` CHAR(3) NOT NULL,
  `codeInc` CHAR(10) NOT NULL,
  FOREIGN KEY (`codeTypeInt`) REFERENCES `TypeIntervention`(`codeTypeInt`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`codeInc`) REFERENCES `Incendie`(`codeInc`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Gouvernorat` VALUES ('G03', 'Ben Arous'), ('G06', 'Zaghouan'), ('G09', 'Jendouba'), ('G11', 'Siliana'), ('G13', 'Kairouan');
INSERT INTO `Ville` VALUES ('V0001', 'Hammam Lif', 1, 'G03'), ('V0002', 'Bargou', 1, 'G11'), ('V0003', 'Zaghouan', 1, 'G06'), ('V0004', 'Aïn Draham', 3, 'G09'), ('V0005', 'Souk Jomaa', 1, 'G09'), ('V0006', 'Ghardimaou', 1, 'G09');
INSERT INTO `Foret` VALUES ('F00001', 'Parc national de Boukornine', 1939.000, 'V0001'), ('F00002', 'Forêt de Jbel Serj', 1720.000, 'V0002'), ('F00003', 'Forêt de Jbel Zaghouan', 2010.000, 'V0003'), ('F00004', 'Réserve naturelle de Aïn Zana', 47.000, 'V0004'), ('F00005', 'Forêt Bent Hmed', 1541.000, 'V0005'), ('F00006', 'Parc national d''El Feija', 2632.000, 'V0006'), ('F00007', 'La Tourbière de Dar Fatma', 15.000, 'V0004'), ('F00008', 'Forêt d''Aïn Soltane', 2632.000, 'V0004');
INSERT INTO `Incendie` VALUES ('INC0000001', '2024-07-01 15:00:00', 200.000, 'E', '2024-07-03 18:00:00', 'F00001'), ('INC0000002', '2024-07-05 10:00:00', 70.000, 'E', '2024-07-05 17:00:00', 'F00002'), ('INC0000003', '2024-08-20 11:00:00', 300.000, 'E', '2024-08-22 12:00:00', 'F00003'), ('INC0000004', '2023-06-15 13:30:00', 50.000, 'E', '2023-06-16 09:00:00', 'F00001'), ('INC0000005', '2023-07-20 16:00:00', 120.000, 'E', '2023-07-21 10:00:00', 'F00001'), ('INC0000006', '2023-08-05 14:00:00', 80.000, 'E', '2023-08-06 08:00:00', 'F00004'), ('INC0000007', '2023-05-30 12:00:00', 40.000, 'E', '2023-05-30 20:00:00', 'F00002'), ('INC0000008', '2024-09-10 09:00:00', 150.000, 'A', NULL, 'F00006'), ('INC0000009', '2024-10-02 17:30:00', 65.000, 'A', NULL, 'F00002'), ('INC0000010', '2025-05-30 09:00:00', 90.000, 'A', NULL, 'F00005');
INSERT INTO `TypeIntervention` VALUES ('TI1', 'Aérienne'), ('TI2', 'Terrestre'), ('TI3', 'Maritime'), ('TI4', 'Mixte');
INSERT INTO `Intervention` VALUES ('INT0000001', '2024-07-01 17:00:00', '2024-07-02 12:00:00', 80.000, 'TI2', 'INC0000001'), ('INT0000002', '2024-07-02 08:00:00', '2024-07-02 12:00:00', 20.000, 'TI1', 'INC0000001'), ('INT0000003', '2024-07-02 12:00:00', '2024-07-03 18:00:00', 100.000, 'TI2', 'INC0000001'), ('INT0000004', '2024-07-05 11:00:00', '2024-07-05 17:00:00', 70.000, 'TI4', 'INC0000002'), ('INT0000005', '2024-08-20 11:30:00', '2024-08-21 12:00:00', 200.000, 'TI1', 'INC0000003'), ('INT0000006', '2024-08-21 11:00:00', '2024-08-22 12:00:00', 100.000, 'TI2', 'INC0000003'), ('INT0000007', '2024-07-03 08:00:00', '2024-07-03 14:00:00', 15.000, 'TI1', 'INC0000001'), ('INT0000008', '2024-07-03 14:00:00', '2024-07-03 18:00:00', 10.000, 'TI3', 'INC0000001'), ('INT0000009', '2024-08-22 06:00:00', '2024-08-22 12:00:00', 40.000, 'TI2', 'INC0000003');
