-- Base bd2026_croisieres (Bac STI 2026, session de 12h30) : Marivana Voyages
-- Version complète : tables fournies + relations + table reservation.

CREATE TABLE `navire` (
  `idNav` varchar(3) NOT NULL,
  `nomNav` varchar(100) DEFAULT NULL,
  `capacite` int NOT NULL,
  PRIMARY KEY (`idNav`),
  UNIQUE KEY `nomNav` (`nomNav`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `navire` (`idNav`, `nomNav`, `capacite`) VALUES
('1', 'Tanit', 3200);
INSERT INTO `navire` (`idNav`, `nomNav`, `capacite`) VALUES
('2', 'Carthage', 2208);

CREATE TABLE `destination` (
  `idDes` int NOT NULL,
  `nomDes` varchar(100) NOT NULL,
  PRIMARY KEY (`idDes`),
  UNIQUE KEY `nomDes` (`nomDes`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `destination` (`idDes`, `nomDes`) VALUES
(1, 'Alexandrie');
INSERT INTO `destination` (`idDes`, `nomDes`) VALUES
(2, 'Barcelone');
INSERT INTO `destination` (`idDes`, `nomDes`) VALUES
(3, 'Beyrouth');

CREATE TABLE `croisiere` (
  `idCro` varchar(5) NOT NULL,
  `libCro` varchar(100) NOT NULL,
  `duree` int NOT NULL,
  `prix` int NOT NULL,
  `dateDepart` date NOT NULL,
  `idDes` int NOT NULL,
  `idNav` varchar(3) NOT NULL,
  PRIMARY KEY (`idCro`),
  UNIQUE KEY `libCro` (`libCro`),
  CONSTRAINT `fk_croisiere_destination` FOREIGN KEY (`idDes`) REFERENCES `destination` (`idDes`),
  CONSTRAINT `fk_croisiere_navire` FOREIGN KEY (`idNav`) REFERENCES `navire` (`idNav`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES
('101', 'Eclat méditerranéen', 3, 1200, '2026-05-18', 1, '1');
INSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES
('102', 'Perle d’Azur', 5, 2000, '2026-05-16', 3, '2');
INSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES
('103', 'Riviera des Mers', 5, 3000, '2026-05-17', 2, '1');
INSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES
('104', 'Nil et Delta', 4, 1500, '2026-06-20', 1, '2');

CREATE TABLE `client` (
  `idCl` varchar(10) NOT NULL,
  `nomCl` varchar(100) NOT NULL,
  `telCl` int NOT NULL,
  PRIMARY KEY (`idCl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `client` (`idCl`, `nomCl`, `telCl`) VALUES
('01234567', 'Najla Soussi', 99998888);
INSERT INTO `client` (`idCl`, `nomCl`, `telCl`) VALUES
('A123456789', 'Kamel Nebli', 22111222);

CREATE TABLE `reservation` (
  `idCl` varchar(10) NOT NULL,
  `idCro` varchar(5) NOT NULL,
  `dateRes` datetime NOT NULL,
  `nbPlace` int NOT NULL,
  PRIMARY KEY (`idCl`, `idCro`),
  CONSTRAINT `fk_reservation_client` FOREIGN KEY (`idCl`) REFERENCES `client` (`idCl`),
  CONSTRAINT `fk_reservation_croisiere` FOREIGN KEY (`idCro`) REFERENCES `croisiere` (`idCro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Jeu d'essai
INSERT INTO `reservation` (`idCl`, `idCro`, `dateRes`, `nbPlace`) VALUES
('01234567', '101', '2026-05-10 11:00:00', 2);
