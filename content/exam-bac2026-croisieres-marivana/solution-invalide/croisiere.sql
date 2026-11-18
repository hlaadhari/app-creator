CREATE TABLE  `navire` (
  `idNav` varchar(3) NOT NULL,
  `nomNav` varchar(100) DEFAULT NULL,
  `capacite` int NOT NULL,
  PRIMARY KEY (`idNav`),
  UNIQUE KEY `nomNav` (`nomNav`)
) ENGINE=InnoDB ;

INSERT INTO `navire` (`idNav`, `nomNav`, `capacite`) VALUES
('1', 'Tanit', 3200),
('2', 'Carthage', 2208);

CREATE TABLE  `destination` (
  `idDes` int NOT NULL,
  `nomDes` varchar(100) NOT NULL,
  PRIMARY KEY (`idDes`),
  UNIQUE KEY `nomDes` (`nomDes`)
) ENGINE=InnoDB ;

INSERT INTO `destination` (`idDes`, `nomDes`) VALUES
(1, 'Alexandrie'),
(2, 'Barcelone'),
(3, 'Beyrouth');

CREATE TABLE  `croisiere` (
  `idCro` varchar(5) NOT NULL,
  `libCro` varchar(100) NOT NULL,
  `duree` int NOT NULL,
  `prix` int NOT NULL,
  `dateDepart` date NOT NULL,
  `idDes` int NOT NULL,
  `idNav` varchar(3) NOT NULL,
  PRIMARY KEY (`idCro`),
  UNIQUE KEY `libCro` (`libCro`)
) ENGINE=InnoDB ;

INSERT INTO `croisiere` (`idCro`, `libCro`, `duree`, `prix`, `dateDepart`, `idDes`, `idNav`) VALUES
('101', 'Eclat méditerranéen', 3, 1200, '2026-05-18', 1, '1'),
('102', 'Perle d’Azur', 5, 2000, '2026-05-16', 3, '2'),
('103', 'Riviera des Mers', 5, 3000, '2026-05-17', 2, '1');

CREATE TABLE  `client` (
  `idCl` varchar(10) NOT NULL,
  `nomCl` varchar(100) NOT NULL,
  `telCl` int NOT NULL,
  PRIMARY KEY (`idCl`)
) ENGINE=InnoDB ;

INSERT INTO `client` (`idCl`, `nomCl`, `telCl`) VALUES
('01234567', 'Najla Soussi', 99998888),
('A123456789', 'Kamel Nebli', 22111222);