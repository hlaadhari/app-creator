-- =============================================================================
-- Base de Données Officielle : bd_bac2023_principale (BioLab-Medoc)
-- Baccalauréat 2023 - Session Principale (Section Sciences de l'Informatique)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `Plante` (
  `codePlante` VARCHAR(6) PRIMARY KEY,
  `nomPlante` VARCHAR(30) NOT NULL,
  `descPlante` VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Forme` (
  `codeForme` VARCHAR(6) PRIMARY KEY,
  `nomForme` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Medicament` (
  `codeMed` VARCHAR(6) PRIMARY KEY,
  `nomMed` VARCHAR(30) NOT NULL,
  `dateFab` DATE NOT NULL,
  `caracMed` VARCHAR(100) NOT NULL,
  `codeForme` VARCHAR(6),
  FOREIGN KEY (`codeForme`) REFERENCES `Forme`(`codeForme`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Composition` (
  `codeMed` VARCHAR(6),
  `codePlante` VARCHAR(6),
  `dose` INT NOT NULL CHECK (`dose` > 0),
  PRIMARY KEY (`codeMed`, `codePlante`),
  FOREIGN KEY (`codeMed`) REFERENCES `Medicament`(`codeMed`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`codePlante`) REFERENCES `Plante`(`codePlante`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Maladie` (
  `codeMaladie` VARCHAR(6) PRIMARY KEY,
  `nomMaladie` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Traitement` (
  `codeMed` VARCHAR(6),
  `codeMaladie` VARCHAR(6),
  `quantite` INT NOT NULL CHECK (`quantite` > 0),
  `duree` INT NOT NULL CHECK (`duree` > 0),
  PRIMARY KEY (`codeMed`, `codeMaladie`),
  FOREIGN KEY (`codeMed`) REFERENCES `Medicament`(`codeMed`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`codeMaladie`) REFERENCES `Maladie`(`codeMaladie`) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Données initiales de l'épreuve
INSERT INTO `Plante` VALUES 
  ('BS0001', 'Thym', 'Plante antiseptique et stimulante'),
  ('BS0002', 'Eucalyptus', 'Plante décongestionnante respiratoire'),
  ('BS0003', 'Menthe Poivrée', 'Plante digestive et calmante');

INSERT INTO `Forme` VALUES 
  ('F01', 'Sirop'),
  ('F02', 'Comprimé'),
  ('F03', 'Pommade');

INSERT INTO `Medicament` VALUES 
  ('Med001', 'ThymoSirop', '2023-05-01', 'Sirop apaisant gorge', 'F01'),
  ('Med002', 'Eucalyptol', '2023-05-10', 'Comprimé respiratoire', 'F02'),
  ('Med003', 'DigestCalm', '2022-10-15', 'Sirop digestif', 'F01');

INSERT INTO `Composition` VALUES 
  ('Med001', 'BS0001', 50),
  ('Med001', 'BS0002', 25),
  ('Med002', 'BS0002', 100),
  ('Med003', 'BS0003', 75);

INSERT INTO `Maladie` VALUES 
  ('TSE005', 'Toux Sèche'),
  ('MAL02', 'Fièvre'),
  ('MAL03', 'Troubles Digestifs');

INSERT INTO `Traitement` VALUES 
  ('Med001', 'TSE005', 2, 5),
  ('Med002', 'TSE005', 3, 7),
  ('Med002', 'MAL02', 1, 3);
