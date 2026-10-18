-- ==============================================================================
-- Initialisation Base de Données - TP Météo & Agrégations (tp-fs-02)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS station (
  id_station INT AUTO_INCREMENT PRIMARY KEY,
  nom_station VARCHAR(50) NOT NULL,
  ville VARCHAR(50) NOT NULL,
  altitude INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mesure (
  id_mesure INT AUTO_INCREMENT PRIMARY KEY,
  id_station INT NOT NULL,
  temperature DECIMAL(4,1) NOT NULL,
  humidite INT NOT NULL CHECK (humidite BETWEEN 0 AND 100),
  date_mesure DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_station) REFERENCES station(id_station) ON DELETE CASCADE
);

-- Données initiales de test
INSERT INTO station (id_station, nom_station, ville, altitude) VALUES
(1, 'Station Nord', 'Tunis', 10),
(2, 'Station Sahel', 'Sousse', 15),
(3, 'Station Sud', 'Sfax', 8);

INSERT INTO mesure (id_station, temperature, humidite, date_mesure) VALUES
(1, 22.5, 65, '2026-05-01 08:00:00'),
(1, 28.0, 50, '2026-05-01 14:00:00'),
(1, 20.0, 70, '2026-05-01 20:00:00'),
(2, 24.0, 60, '2026-05-01 08:00:00'),
(2, 30.5, 45, '2026-05-01 14:00:00'),
(3, 26.0, 55, '2026-05-01 08:00:00'),
(3, 33.0, 40, '2026-05-01 14:00:00');
