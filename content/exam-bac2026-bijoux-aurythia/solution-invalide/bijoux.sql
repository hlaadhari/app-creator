CREATE TABLE `bijou` (
  `idBij` varchar(5) NOT NULL,
  `description` varchar(100) NOT NULL,
  `prixVente` int NOT NULL,
  `poids` int NOT NULL
) ENGINE=InnoDB;

CREATE TABLE  `metal` (
  `idMet` varchar(1) NOT NULL,
  `nomMet` varchar(50)  NOT NULL
) ENGINE=InnoDB ;

CREATE TABLE `composition` (
  `idBij` varchar(5) NOT NULL,
  `idMet` varchar(1)  NOT NULL
) ENGINE=InnoDB ;

CREATE TABLE `expert` (
  `idExp` varchar(3) NOT NULL,
  `nomExp` varchar(50)  NOT NULL,
  `mail` varchar(100)  NOT NULL
) ENGINE=InnoDB ;

alter table metal add CONSTRAINT C1 unique (nomMet);
alter table expert add CONSTRAINT C2 unique (nomExp);
alter table expert add CONSTRAINT C3 unique (mail);


INSERT INTO `expert` (`idExp`, `nomExp`, `mail`) VALUES
('A22', 'Chokri Sfaxi', 'Chokrisfaxi@gmail.com'),
('A23', 'Mohamed Jerbi', 'MohamedJerbi@gmail.com'),
('A24', 'Radhia Gafsi', 'RadhiaGafsi@gmail.com');

INSERT INTO `metal` (`idMet`, `nomMet`) VALUES
('A', 'Argent'),
('R', 'Or'),
('P', 'Platine');

INSERT INTO `bijou` (`idBij`, `description`,`prixVente`, `poids` ) VALUES
('bg123', 'bague',2000, 5 ),
('co789', 'colier',5000, 10 ),
('bg124', 'bague avec diamant',3500, 7 );

INSERT INTO `composition` (`idBij`, `idMet` ) VALUES
('bg123', 'R' ),
('bg123', 'A' ),
('co789', 'P' ),
('bg124', 'R' );
