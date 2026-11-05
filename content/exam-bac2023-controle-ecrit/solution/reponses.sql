-- =============================================================================
-- Solution Officielle : Bac STI 2023 Session de Contrôle (Écrit)
-- =============================================================================

-- Exercice 4 : Requêtes SQL LID
SELECT S.dateSeisme, S.codeLieu, S.magnitude FROM Seisme S, LieuSeisme L WHERE S.codeLieu = L.codeLieu AND L.codeVille = 'AFN324';
SELECT S.dateSeisme, S.magnitude, V.nomVille FROM Seisme S, LieuSeisme L, Ville V WHERE S.codeLieu = L.codeLieu AND L.codeVille = V.codeVille AND V.codePays = 'IDN';
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude > 6.9 ORDER BY magnitude DESC;
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE dateSeisme >= '2022-01-01' AND dateSeisme <= '2022-12-31';
SELECT V.nomVille, COUNT(S.codeLieu) AS NbSeismes FROM Seisme S, LieuSeisme L, Ville V WHERE S.codeLieu = L.codeLieu AND L.codeVille = V.codeVille AND V.codePays = 'IDN' GROUP BY V.nomVille;
SELECT dateSeisme, codeLieu, magnitude FROM Seisme WHERE magnitude = (SELECT MAX(magnitude) FROM Seisme);
SELECT L.codeVille, COUNT(*) AS Total FROM Seisme S, LieuSeisme L WHERE S.codeLieu = L.codeLieu AND S.magnitude > 6 GROUP BY L.codeVille HAVING COUNT(*) >= 3;

-- Exercice 4 : Requêtes LDD et LMD
ALTER TABLE Seisme ADD degat VARCHAR(100);
DELETE FROM Seisme WHERE magnitude < 3.5;
UPDATE LieuSeisme SET longitude = 25.12 WHERE codeLieu = 'ZGP123';
INSERT INTO Ville (codeVille, nomVille, codePays) VALUES ('AFN223', 'Hatay', 'TUR');
