-- Schéma de base de données : bd_testdrive (Bac STI 2018)
-- Système d'Évaluation et d'Essai Automobile

CREATE TABLE IF NOT EXISTS voiture (
    immatriculation VARCHAR(20) PRIMARY KEY,
    marque VARCHAR(30) NOT NULL,
    modele VARCHAR(30) NOT NULL,
    energie VARCHAR(15) NOT NULL,
    disponible CHAR(1) DEFAULT 'O' CHECK (disponible IN ('O', 'N'))
);

CREATE TABLE IF NOT EXISTS client (
    cin VARCHAR(8) PRIMARY KEY,
    nom VARCHAR(30) NOT NULL,
    prenom VARCHAR(30) NOT NULL,
    permis VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation (
    id_eval INT PRIMARY KEY AUTO_INCREMENT,
    cin VARCHAR(8) NOT NULL,
    immatriculation VARCHAR(20) NOT NULL,
    date_test DATE NOT NULL,
    note_confort INT NOT NULL CHECK (note_confort BETWEEN 1 AND 5),
    note_conduite INT NOT NULL CHECK (note_conduite BETWEEN 1 AND 5),
    note_securite INT NOT NULL CHECK (note_securite BETWEEN 1 AND 5),
    commentaire TEXT,
    FOREIGN KEY (cin) REFERENCES client(cin),
    FOREIGN KEY (immatriculation) REFERENCES voiture(immatriculation)
);

-- Données initiales d'amorce
INSERT INTO client (cin, nom, prenom, permis) VALUES
('09876543', 'Gharbi', 'Karim', 'B-123456'),
('01234567', 'Mejri', 'Salma', 'B-654321');

INSERT INTO voiture (immatriculation, marque, modele, energie, disponible) VALUES
('198-TN-1234', 'Peugeot', '208 GT-Line', 'Essence', 'O'),
('210-TN-5678', 'Renault', 'Clio 5 Intens', 'Diesel', 'O'),
('225-TN-9999', 'Volkswagen', 'Golf 8 Style', 'Hybride', 'O');

INSERT INTO evaluation (cin, immatriculation, date_test, note_confort, note_conduite, note_securite, commentaire) VALUES
('09876543', '198-TN-1234', '2023-05-10', 4, 5, 4, 'Très bonne tenue de route et moteur dynamique'),
('01234567', '198-TN-1234', '2023-05-12', 5, 4, 5, 'Conduite agréable et insonorisation remarquable');
