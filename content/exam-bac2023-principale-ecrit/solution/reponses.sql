-- =============================================================================
-- Solution Officielle : Bac STI 2023 Session Principale (Écrit)
-- =============================================================================

-- Exercice 5 : Requêtes LDD
ALTER TABLE Medicament ADD dateFin DATE;
ALTER TABLE Medicament MODIFY caracMed VARCHAR(150);

-- Exercice 5 : Requêtes LID
SELECT * FROM Plante ORDER BY nomPlante DESC;
SELECT M.nomMed, M.caracMed FROM Medicament M, Forme F WHERE M.codeForme = F.codeForme AND F.nomForme = 'Sirop';
SELECT P.codePlante, P.nomPlante, P.descPlante FROM Plante P, Composition C WHERE P.codePlante = C.codePlante AND C.codeMed = 'Med001';
SELECT M.nomMed FROM Medicament M, Traitement T, Maladie MA WHERE M.codeMed = T.codeMed AND T.codeMaladie = MA.codeMaladie AND MA.nomMaladie = 'Fièvre';
SELECT codeMed, nomMed FROM Medicament WHERE dateFab >= '2023-01-01' AND dateFab <= '2023-12-31';
SELECT AVG(duree) AS DureeMoyenne FROM Traitement WHERE codeMaladie = 'TSE005';
SELECT codeMed FROM Traitement WHERE codeMaladie = 'TSE005' AND duree = (SELECT MIN(duree) FROM Traitement WHERE codeMaladie = 'TSE005');
SELECT M.codeMed, M.nomMed FROM Medicament M, Composition C WHERE M.codeMed = C.codeMed GROUP BY M.codeMed, M.nomMed HAVING COUNT(C.codePlante) >= 2;

-- Exercice 5 : Requêtes LMD
INSERT INTO Forme (codeForme, nomForme) VALUES ('IF0005', 'Inhalation');
UPDATE Composition SET dose = 100 WHERE codePlante = 'BS0001' AND codeMed = 'Med001';
