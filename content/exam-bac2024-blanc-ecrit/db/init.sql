-- Base de données initiale pour Bac Blanc 2024 (Streaming_HD)
CREATE TABLE IF NOT EXISTS Pays (
  IdPays INT PRIMARY KEY,
  NomPays VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS Streamer (
  IdStream INT PRIMARY KEY,
  Pseudo VARCHAR(30) NOT NULL,
  Email VARCHAR(60) NOT NULL,
  IdPays INT NOT NULL,
  FOREIGN KEY (IdPays) REFERENCES Pays(IdPays)
);

CREATE TABLE IF NOT EXISTS Chaine (
  IdChaine VARCHAR(10) PRIMARY KEY,
  NomChaine VARCHAR(50) NOT NULL,
  DesChaine VARCHAR(120),
  URL VARCHAR(100),
  IdStream INT NOT NULL,
  FOREIGN KEY (IdStream) REFERENCES Streamer(IdStream)
);

CREATE TABLE IF NOT EXISTS TypeContenu (
  IdType INT PRIMARY KEY,
  NomType VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS Contenu (
  IdType INT NOT NULL,
  IdChaine VARCHAR(10) NOT NULL,
  Titre VARCHAR(80) NOT NULL,
  DateCreation DATE NOT NULL,
  Duree INT NOT NULL,
  NbreVues INT NOT NULL,
  Mode VARCHAR(1) NOT NULL,
  PRIMARY KEY (IdType, IdChaine, Titre),
  FOREIGN KEY (IdType) REFERENCES TypeContenu(IdType),
  FOREIGN KEY (IdChaine) REFERENCES Chaine(IdChaine)
);

INSERT INTO Pays VALUES (1, 'Tunisie'), (2, 'France');

INSERT INTO Streamer VALUES
  (10, 'TechTunisia', 'tech@sti.tn', 1),
  (11, 'CodeMaster', 'code@sti.tn', 2);

INSERT INTO Chaine VALUES
  ('C005', 'Labo STI', 'Cours informatique', 'https://stream.tn/c005', 10),
  ('C006', 'Dev Live', 'Live coding', 'https://stream.tn/c006', 11);

INSERT INTO TypeContenu VALUES
  (1, 'Education'),
  (2, 'Gaming');

INSERT INTO Contenu VALUES
  (1, 'C005', 'SQL Avance', '2024-03-15', 45, 2500, 'I'),
  (2, 'C005', 'Retro 2016', '2016-06-10', 30, 800, 'I'),
  (1, 'C006', 'PHP PDO', '2024-04-20', 50, 1800, 'D');
