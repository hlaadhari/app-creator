-- Base bd2025 (Bac STI 2025) : droits d'accès aux documents partagés
-- Version complète : tables fournies (document, utilisateur) + table droit et ses relations.

CREATE TABLE `document` (
  `idDoc` varchar(5) NOT NULL,
  `nomDoc` varchar(50) NOT NULL DEFAULT '',
  `dateCreation` datetime NOT NULL,
  PRIMARY KEY (`idDoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES
('D0001', 'Liste employés.pdf', '2025-02-15 09:14:39');
INSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES
('D0002', 'Demande de congés.docx', '2021-10-09 08:10:09');
INSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES
('D0003', 'Réclamation ouvriers.docx', '2022-02-07 11:00:29');
INSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES
('D0004', 'Statistiques2024.xlsx', '2025-01-31 07:00:20');

CREATE TABLE `utilisateur` (
  `idUtil` varchar(4) NOT NULL,
  `nomPrenom` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`idUtil`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U001', 'Ali GAFSI');
INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U002', 'Mohamed SOUSSI');
INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U003', 'Karima TOUNSI');
INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U004', 'Kamel SFAXI');
INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U005', 'Houda JANDOUBI');
INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U006', 'Taoufik BEJI');

CREATE TABLE `droit` (
  `idDoc` varchar(5) NOT NULL,
  `idUtil` varchar(4) NOT NULL,
  `ecriture` char(1) NOT NULL,
  `lecture` char(1) NOT NULL,
  `impression` char(1) NOT NULL,
  PRIMARY KEY (`idDoc`, `idUtil`),
  CONSTRAINT `fk_droit_document` FOREIGN KEY (`idDoc`) REFERENCES `document` (`idDoc`),
  CONSTRAINT `fk_droit_utilisateur` FOREIGN KEY (`idUtil`) REFERENCES `utilisateur` (`idUtil`),
  CONSTRAINT `ck_droit_valeurs` CHECK (`ecriture` IN ('O','N') AND `lecture` IN ('O','N') AND `impression` IN ('O','N'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jeu d'essai (le droit d'écriture ou d'impression suppose le droit de lecture)
INSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES
('D0001', 'U001', 'O', 'O', 'O');
INSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES
('D0001', 'U002', 'N', 'O', 'N');
INSERT INTO `droit` (`idDoc`, `idUtil`, `ecriture`, `lecture`, `impression`) VALUES
('D0002', 'U003', 'N', 'O', 'O');
