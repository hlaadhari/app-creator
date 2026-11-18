--
-- Création de la table `document`
--

CREATE TABLE  `document` (
  `idDoc` varchar(5) NOT NULL,
  `nomDoc` varchar(50) NOT NULL DEFAULT '',
  `dateCreation` datetime  NOT NULL,
  PRIMARY KEY (`idDoc`)
) ENGINE=InnoDB ;

--
-- Remplissage des données de la table `document`
--

INSERT INTO `document` (`idDoc`, `nomDoc`, `dateCreation`) VALUES
('D0001', 'Liste employés.pdf', '2025-02-15 09:14:39'),
('D0002', 'Demande de congés.docx', '2021-10-09 08:10:09'),
('D0003', 'Réclamation ouvriers.docx', '2022-02-07 11:00:29'),
('D0004', 'Statistiques2024.xlsx', '2025-01-31 07:00:20');

-- --------------------------------------------------------

--
-- Création de la table `utilisateur`
--

CREATE TABLE `utilisateur` (
  `idUtil` varchar(4) NOT NULL,
  `nomPrenom` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`idUtil`)
) ENGINE=InnoDB ;

--
-- Remplissage des données de la table `utilisateur`
--

INSERT INTO `utilisateur` (`idUtil`, `nomPrenom`) VALUES
('U001', 'Ali GAFSI'),
('U002', 'Mohamed SOUSSI'),
('U003', 'Karima TOUNSI'),
('U004', 'Kamel SFAXI'),
('U005', 'Houda JANDOUBI'),
('U006', 'Taoufik BEJI');

