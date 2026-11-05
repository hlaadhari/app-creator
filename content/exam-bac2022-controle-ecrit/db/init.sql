-- ========================================================================
-- Labo STI - Base de Données Officielle : Bac STI 2022 Session de Contrôle
-- Épreuve Écrite Théorique : Bases de Données (2h - Coefficient 1.5)
-- ========================================================================

-- ------------------------------------------------------------------------
-- Exercice 2 : Base "GestionConcours" (DDL & Contraintes)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Candidat` (
  `NumCandidat` INT PRIMARY KEY,
  `Nom` VARCHAR(30) NOT NULL,
  `Prenom` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Evaluation` (
  `NumCandidat` INT NOT NULL,
  `CodeEpreuve` VARCHAR(10) NOT NULL,
  `Note` DECIMAL(4,2),
  PRIMARY KEY (`NumCandidat`, `CodeEpreuve`),
  FOREIGN KEY (`NumCandidat`) REFERENCES `Candidat`(`NumCandidat`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Candidat` VALUES (101, 'Gharbi', 'Sami'), (102, 'Mansour', 'Leila');

-- ------------------------------------------------------------------------
-- Exercice 3 : Base "Gaming" (DDL & DML)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Categorie` (
  `CodeCat` VARCHAR(10) PRIMARY KEY,
  `LibCat` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Jeu` (
  `CodeJeu` VARCHAR(10) PRIMARY KEY,
  `LibJeu` VARCHAR(30) NOT NULL,
  `NatJeu` CHAR(1) CHECK (`NatJeu` IN ('P', 'G')),
  `AgeMin` INT,
  `CodeCat` VARCHAR(10),
  FOREIGN KEY (`CodeCat`) REFERENCES `Categorie`(`CodeCat`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Categorie` VALUES ('CAT1', 'Jeux SPORT'), ('CAT2', 'Aventure');
INSERT INTO `Jeu` VALUES ('J003', 'Football Star', 'G', 7, 'CAT1');

-- ------------------------------------------------------------------------
-- Exercice 4 : Base "GestionEmployes" (Requêtes SQL DML / LID)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Service` (
  `NumService` INT PRIMARY KEY,
  `LibService` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Grade` (
  `CodeGrade` VARCHAR(4) PRIMARY KEY,
  `LibGrade` VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Employe` (
  `MatEmp` VARCHAR(5) PRIMARY KEY,
  `NomEmp` VARCHAR(20) NOT NULL,
  `DateRecrut` DATE NOT NULL,
  `NumService` INT,
  `CodeGrade` VARCHAR(4),
  FOREIGN KEY (`NumService`) REFERENCES `Service`(`NumService`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`CodeGrade`) REFERENCES `Grade`(`CodeGrade`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Prime` (
  `AnneePrime` INT,
  `MatEmp` VARCHAR(5),
  `MontPrime` DECIMAL(8,3) CHECK (`MontPrime` >= 0),
  PRIMARY KEY (`AnneePrime`, `MatEmp`),
  FOREIGN KEY (`MatEmp`) REFERENCES `Employe`(`MatEmp`) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Données initiales pour validation des requêtes de l'Exercice 4
INSERT INTO `Service` VALUES 
  (1, 'Sécurité'), 
  (2, 'Informatique'), 
  (3, 'Comptabilité');

INSERT INTO `Grade` VALUES 
  ('G1', 'Agent Principal'), 
  ('G2', 'Technicien'), 
  ('G3', 'Ingénieur');

INSERT INTO `Employe` VALUES 
  ('E01', 'Ben Ali Sami', '2021-04-12', 1, 'G1'),
  ('E02', 'Trabelsi Olfa', '2021-09-01', 1, 'G2'),
  ('E03', 'Khelifi Mourad', '2019-02-15', 2, 'G3');

INSERT INTO `Prime` VALUES 
  (2021, 'E01', 500.000),
  (2022, 'E01', 600.000),
  (2021, 'E02', 450.000),
  (2014, 'E03', 300.000);
