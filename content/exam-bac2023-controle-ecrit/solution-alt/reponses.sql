-- =============================================================================
-- Solution Alternative : Bac STI 2023 Session de Contrôle (Écrit)
-- =============================================================================

SELECT Seisme.dateSeisme, Seisme.codeLieu, Seisme.magnitude FROM Seisme INNER JOIN LieuSeisme ON Seisme.codeLieu = LieuSeisme.codeLieu WHERE LieuSeisme.codeVille = 'AFN324';
SELECT Seisme.dateSeisme, Seisme.magnitude, Ville.nomVille FROM Seisme INNER JOIN LieuSeisme ON Seisme.codeLieu = LieuSeisme.codeLieu INNER JOIN Ville ON LieuSeisme.codeVille = Ville.codeVille WHERE Ville.codePays = 'IDN';
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude > 6.9 ORDER BY magnitude DESC;
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE dateSeisme BETWEEN '2022-01-01' AND '2022-12-31';
SELECT Ville.nomVille, COUNT(Seisme.codeLieu) AS NbSeismes FROM Seisme INNER JOIN LieuSeisme ON Seisme.codeLieu = LieuSeisme.codeLieu INNER JOIN Ville ON LieuSeisme.codeVille = Ville.codeVille WHERE Ville.codePays = 'IDN' GROUP BY Ville.nomVille;
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude = (SELECT MAX(magnitude) FROM Seisme);
SELECT LieuSeisme.codeVille, COUNT(*) AS Total FROM Seisme INNER JOIN LieuSeisme ON Seisme.codeLieu = LieuSeisme.codeLieu WHERE Seisme.magnitude > 6 GROUP BY LieuSeisme.codeVille HAVING COUNT(*) >= 3;

ALTER TABLE Seisme ADD COLUMN degat VARCHAR(100);
DELETE FROM Seisme WHERE magnitude <= 3.4;
UPDATE LieuSeisme SET longitude = 25.12 WHERE codeLieu = 'ZGP123';
INSERT INTO Ville VALUES ('AFN223', 'Hatay', 'TUR');
