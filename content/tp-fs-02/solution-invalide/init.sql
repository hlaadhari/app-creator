-- Schéma invalide : tables sans clé étrangère ni contrainte CHECK
CREATE TABLE station (
  id_station INT PRIMARY KEY,
  nom_station VARCHAR(50)
);

CREATE TABLE mesure (
  id_mesure INT PRIMARY KEY,
  id_station INT,
  temperature DECIMAL(4,1),
  humidite INT
);
