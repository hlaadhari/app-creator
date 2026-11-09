-- ==============================================================================
-- Bases de données de l'épreuve : BD_Collecte (exercice 2) et StreamVision (exercice 3)
-- Baccalauréat STI 2024 - Session de contrôle (Épreuve Écrite Théorique)
-- ==============================================================================

-- ---------- BD_Collecte (poubelles intelligentes) ----------
CREATE TABLE IF NOT EXISTS `Poubelle` (
  `idPoub` INT PRIMARY KEY,
  `nomRue` VARCHAR(50) NOT NULL,
  `volMax` DECIMAL(6,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Remplissage` (
  `dateRemp` DATETIME NOT NULL,
  `idPoub` INT NOT NULL,
  `nivRemp` INT NOT NULL,
  PRIMARY KEY (`dateRemp`, `idPoub`),
  FOREIGN KEY (`idPoub`) REFERENCES `Poubelle`(`idPoub`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Agent` (
  `idAg` INT PRIMARY KEY,
  `nomAg` VARCHAR(40) NOT NULL,
  `telAg` CHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Collecte` (
  `dateCol` DATE NOT NULL,
  `idPoub` INT NOT NULL,
  `poids` DECIMAL(6,2) NOT NULL,
  `idAg` INT NOT NULL,
  PRIMARY KEY (`dateCol`, `idPoub`),
  FOREIGN KEY (`idPoub`) REFERENCES `Poubelle`(`idPoub`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`idAg`) REFERENCES `Agent`(`idAg`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Poubelle` VALUES (1, 'Rue de la Liberté', 120.00), (2, 'Avenue Habib Bourguiba', 240.00), (3, 'Rue de la Liberté', 120.00);
INSERT INTO `Remplissage` VALUES ('2024-05-02 06:00:00', 1, 35), ('2024-05-02 18:00:00', 1, 88), ('2024-05-02 18:00:00', 2, 64);
INSERT INTO `Agent` VALUES (1, 'Mansouri', '20123456'), (2, 'Jlassi', '98765432');
INSERT INTO `Collecte` VALUES ('2024-05-02', 1, 41.50, 1), ('2024-05-02', 2, 77.00, 2), ('2024-05-03', 1, 12.25, 1);

-- ---------- StreamVision (plateforme de partage de vidéos) ----------
CREATE TABLE IF NOT EXISTS `Proprietaire` (
  `emailProp` VARCHAR(60) PRIMARY KEY,
  `nomProp` VARCHAR(40) NOT NULL,
  `pswProp` VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Chaine` (
  `idChaine` INT PRIMARY KEY,
  `nomChaine` VARCHAR(40) NOT NULL,
  `emailProp` VARCHAR(60) NOT NULL,
  FOREIGN KEY (`emailProp`) REFERENCES `Proprietaire`(`emailProp`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Video` (
  `idVideo` INT PRIMARY KEY,
  `titreVideo` VARCHAR(60) NOT NULL,
  `duree` INT NOT NULL,
  `taille` DECIMAL(8,2) NOT NULL,
  `idChaine` INT NOT NULL,
  FOREIGN KEY (`idChaine`) REFERENCES `Chaine`(`idChaine`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Tag` (
  `idTag` INT AUTO_INCREMENT PRIMARY KEY,
  `libelleTag` VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS `VideosTag` (
  `idVideo` INT NOT NULL,
  `idTag` INT NOT NULL,
  PRIMARY KEY (`idVideo`, `idTag`),
  FOREIGN KEY (`idVideo`) REFERENCES `Video`(`idVideo`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`idTag`) REFERENCES `Tag`(`idTag`) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `Utilisateur` (
  `emailUtilis` VARCHAR(60) PRIMARY KEY,
  `nomUtilis` VARCHAR(40) NOT NULL,
  `pswUtilis` VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS `Visualisation` (
  `idVis` INT PRIMARY KEY,
  `dateVis` DATETIME NOT NULL,
  `commentaire` VARCHAR(200),
  `appreciation` INT NOT NULL,
  `emailUtilis` VARCHAR(60) NOT NULL,
  `idVideo` INT NOT NULL,
  FOREIGN KEY (`emailUtilis`) REFERENCES `Utilisateur`(`emailUtilis`) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (`idVideo`) REFERENCES `Video`(`idVideo`) ON UPDATE CASCADE ON DELETE CASCADE
);

INSERT INTO `Proprietaire` VALUES ('ppgm@gmail.com', 'Karim Ben Ali', 'pw-prop-1'), ('pweb@gmail.com', 'Leila Gharbi', 'pw-prop-2'), ('adcryp@gmail.com', 'Anis Mejri', 'pw-prop-3'), ('pexp@gmail.com', 'Salma Trabelsi', 'pw-prop-4');
INSERT INTO `Chaine` VALUES (1, 'PgmAlgo', 'ppgm@gmail.com'), (2, 'WebX', 'pweb@gmail.com'), (3, 'Crypto4tous', 'adcryp@gmail.com'), (5, 'info_Experts', 'pexp@gmail.com');
INSERT INTO `Video` VALUES (110, 'Video1', 30, 428.00, 1), (225, 'Video2', 40, 753.00, 1), (303, 'Video3', 10, 259.00, 2), (400, 'Video4', 20, 145.00, 2), (330, 'Chiffrement de Cesar', 18, 90.50, 3), (510, 'Introduction a SQL', 25, 310.50, 5), (520, 'Les bases de PHP', 35, 420.00, 5), (530, 'JavaScript avance', 60, 800.25, 5), (540, 'Projet web complet', 50, 650.75, 5), (2216, 'Film robotique', 15, 120.00, 2), (2438, 'Programmez votre premier robot', 22, 215.40, 2);
INSERT INTO `Tag` VALUES (1, 'Algorithmique'), (2, 'Web'), (3, 'SQL'), (4, 'PHP'), (5, 'Robotique'), (6, 'Cryptographie'), (7, 'JavaScript');
INSERT INTO `VideosTag` VALUES (110, 1), (225, 1), (510, 3), (510, 7), (520, 4), (530, 7), (530, 2), (540, 7), (2438, 7), (2438, 5), (2216, 5);
INSERT INTO `Utilisateur` VALUES ('ch240t@mail.tn', 'Ch240T', 'pw-u-1'), ('sami@mail.tn', 'Sami22', 'pw-u-2'), ('nour@mail.tn', 'NourDev', 'pw-u-3');
INSERT INTO `Visualisation` VALUES (1, '2024-03-01 10:00:00', 'Super video', 1, 'ch240t@mail.tn', 2438), (2, '2024-03-05 18:30:00', 'Tres utile', 1, 'sami@mail.tn', 2438), (3, '2024-03-12 09:15:00', 'la fin du film est surprenante', 1, 'ch240t@mail.tn', 2216), (4, '2024-03-12 20:40:00', 'Bof, la fin du film est decevante', -1, 'nour@mail.tn', 2216), (5, '2024-03-20 14:05:00', '', 1, 'ch240t@mail.tn', 510), (6, '2024-04-02 11:11:00', 'Merci', 1, 'sami@mail.tn', 510), (7, '2024-04-02 16:00:00', '', 1, 'nour@mail.tn', 510), (8, '2024-04-10 08:30:00', 'Clair', 1, 'ch240t@mail.tn', 530), (9, '2024-04-15 19:00:00', '', -1, 'sami@mail.tn', 530), (10, '2024-04-18 21:30:00', 'Top', 1, 'nour@mail.tn', 540), (11, '2024-04-20 10:10:00', '', 1, 'ch240t@mail.tn', 110), (12, '2024-04-22 12:00:00', 'Encore', 1, 'sami@mail.tn', 510), (13, '2024-04-25 17:45:00', 'Bravo', 1, 'nour@mail.tn', 2438);
