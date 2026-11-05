-- =============================================================================
-- Solution Alternative : Bac STI 2023 Session Principale (Écrit)
-- =============================================================================

ALTER TABLE Medicament ADD COLUMN dateFin DATE;
ALTER TABLE Medicament MODIFY COLUMN caracMed VARCHAR(150);

SELECT * FROM Plante ORDER BY nomPlante DESC;
SELECT Medicament.nomMed, Medicament.caracMed FROM Medicament INNER JOIN Forme ON Medicament.codeForme = Forme.codeForme WHERE Forme.nomForme = 'Sirop';
SELECT Plante.codePlante, Plante.nomPlante, Plante.descPlante FROM Plante INNER JOIN Composition ON Plante.codePlante = Composition.codePlante WHERE Composition.codeMed = 'Med001';
SELECT Medicament.nomMed FROM Medicament INNER JOIN Traitement ON Medicament.codeMed = Traitement.codeMed INNER JOIN Maladie ON Traitement.codeMaladie = Maladie.codeMaladie WHERE Maladie.nomMaladie = 'Fièvre';
SELECT codeMed, nomMed FROM Medicament WHERE dateFab BETWEEN '2023-01-01' AND '2023-12-31';
SELECT AVG(duree) AS DureeMoyenne FROM Traitement WHERE codeMaladie = 'TSE005';
SELECT codeMed FROM Traitement WHERE codeMaladie = 'TSE005' AND duree = (SELECT MIN(duree) FROM Traitement WHERE codeMaladie = 'TSE005');
SELECT Medicament.codeMed, Medicament.nomMed FROM Medicament INNER JOIN Composition ON Medicament.codeMed = Composition.codeMed GROUP BY Medicament.codeMed, Medicament.nomMed HAVING COUNT(Composition.codePlante) >= 2;

INSERT INTO Forme VALUES ('IF0005', 'Inhalation');
UPDATE Composition SET dose = 100 WHERE codeMed = 'Med001' AND codePlante = 'BS0001';
