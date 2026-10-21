-- Base bd2026_bijoux (Bac STI 2026) : société de bijoux Aurythia
-- Version complète : tables fournies + clés primaires + table evaluation et relations.

CREATE TABLE `bijou` (
  `idBij` varchar(5) NOT NULL,
  `description` varchar(100) NOT NULL,
  `prixVente` int NOT NULL,
  `poids` int NOT NULL,
  PRIMARY KEY (`idBij`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `metal` (
  `idMet` varchar(1) NOT NULL,
  `nomMet` varchar(50) NOT NULL,
  PRIMARY KEY (`idMet`),
  CONSTRAINT C1 UNIQUE (`nomMet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `composition` (
  `idBij` varchar(5) NOT NULL,
  `idMet` varchar(1) NOT NULL,
  PRIMARY KEY (`idBij`, `idMet`),
  CONSTRAINT `fk_composition_bijou` FOREIGN KEY (`idBij`) REFERENCES `bijou` (`idBij`),
  CONSTRAINT `fk_composition_metal` FOREIGN KEY (`idMet`) REFERENCES `metal` (`idMet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `expert` (
  `idExp` varchar(3) NOT NULL,
  `nomExp` varchar(50) NOT NULL,
  `mail` varchar(100) NOT NULL,
  PRIMARY KEY (`idExp`),
  CONSTRAINT C2 UNIQUE (`nomExp`),
  CONSTRAINT C3 UNIQUE (`mail`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `evaluation` (
  `idExp` varchar(3) NOT NULL,
  `idBij` varchar(5) NOT NULL,
  `finition` int NOT NULL,
  `originalite` char(1) NOT NULL,
  `commentaire` varchar(200) NOT NULL,
  `dateEv` datetime NOT NULL,
  PRIMARY KEY (`idExp`, `idBij`),
  CONSTRAINT `fk_evaluation_expert` FOREIGN KEY (`idExp`) REFERENCES `expert` (`idExp`),
  CONSTRAINT `fk_evaluation_bijou` FOREIGN KEY (`idBij`) REFERENCES `bijou` (`idBij`),
  CONSTRAINT `ck_evaluation_originalite` CHECK (`originalite` IN ('O','N'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES
('A22', 'Chokri Sfaxi', 'Chokrisfaxi@gmail.com');
INSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES
('A23', 'Mohamed Jerbi', 'MohamedJerbi@gmail.com');
INSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES
('A24', 'Radhia Gafsi', 'RadhiaGafsi@gmail.com');

INSERT INTO `metal` (`idMet`, `nomMet`) VALUES
('A', 'Argent');
INSERT INTO `metal` (`idMet`, `nomMet`) VALUES
('R', 'Or');
INSERT INTO `metal` (`idMet`, `nomMet`) VALUES
('P', 'Platine');

INSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES
('bg123', 'bague', 2000, 5);
INSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES
('co789', 'colier', 5000, 10);
INSERT INTO `bijou` (`idBij`, `description`, `prixVente`, `poids`) VALUES
('bg124', 'bague avec diamant', 3500, 7);

INSERT INTO `composition` (`idBij`, `idMet`) VALUES
('bg123', 'R');
INSERT INTO `composition` (`idBij`, `idMet`) VALUES
('bg123', 'A');
INSERT INTO `composition` (`idBij`, `idMet`) VALUES
('co789', 'P');
INSERT INTO `composition` (`idBij`, `idMet`) VALUES
('bg124', 'R');

-- Jeu d'essai : évaluations d'experts
INSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES
('A22', 'bg123', 4, 'O', 'Belle finition', '2026-05-10 10:15:00');
INSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES
('A23', 'bg123', 5, 'O', 'Tres original', '2026-05-11 09:00:00');
INSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES
('A22', 'co789', 3, 'N', 'Modele classique', '2026-05-12 14:30:00');
INSERT INTO `evaluation` (`idExp`, `idBij`, `finition`, `originalite`, `commentaire`, `dateEv`) VALUES
('A24', 'bg124', 2, 'O', 'Design audacieux', '2026-05-12 16:45:00');
