-- Schéma de base de données : bd2023 (Bac STI 2023)
-- Gestion de la Location d'Habits Traditionnels

CREATE TABLE IF NOT EXISTS client (
    cin VARCHAR(8) PRIMARY KEY,
    nom VARCHAR(30) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    tel VARCHAR(8) NOT NULL
);

CREATE TABLE IF NOT EXISTS habit (
    id_habit INT PRIMARY KEY AUTO_INCREMENT,
    description VARCHAR(100) NOT NULL,
    taille VARCHAR(5) NOT NULL,
    prix_jour DECIMAL(6,2) NOT NULL,
    disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))
);

CREATE TABLE IF NOT EXISTS location (
    id_loc INT PRIMARY KEY AUTO_INCREMENT,
    cin VARCHAR(8) NOT NULL,
    id_habit INT NOT NULL,
    date_loc DATE NOT NULL,
    duree INT NOT NULL CHECK (duree > 0),
    FOREIGN KEY (cin) REFERENCES client(cin),
    FOREIGN KEY (id_habit) REFERENCES habit(id_habit)
);

-- Données initiales d'amorce pour les tests de conformité
INSERT INTO client (cin, nom, prenom, tel) VALUES
('08765432', 'Ben Ali', 'Sami', '98123456'),
('12345678', 'Trabelsi', 'Amira', '22456789');

INSERT INTO habit (id_habit, description, taille, prix_jour, disponible) VALUES
(1, 'Jebba Soie Blanche Traditionnelle', 'L', 45.00, 'O'),
(2, 'Caftan Royal Doré Haute Couture', 'M', 75.00, 'O'),
(3, 'Costume Traditionnel Brodé', 'XL', 60.00, 'N');
