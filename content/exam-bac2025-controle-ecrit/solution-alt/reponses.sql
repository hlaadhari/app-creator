-- =============================================================================
-- Solution alternative (jointures explicites, IN, YEAR/MONTH) : Bac STI 2025 Contrôle
-- =============================================================================

SELECT description, SUM(superficieInt) AS total FROM TypeIntervention T INNER JOIN Intervention I ON T.codeTypeInt = I.codeTypeInt GROUP BY description HAVING SUM(superficieInt) >= 120.000;
INSERT INTO Intervention VALUES ('INT0000017', '2025-06-01 14:00:00', NULL, 8.000, 'TI4', 'INC0000010');
SELECT nomForet, superficieForet FROM Foret INNER JOIN Ville ON Foret.codeVille = Ville.codeVille INNER JOIN Gouvernorat ON Ville.codeGouv = Gouvernorat.codeGouv WHERE nomGouv = 'Jendouba';
SELECT nomForet, COUNT(codeInc) AS nb FROM Foret INNER JOIN Incendie ON Foret.codeForet = Incendie.codeForet WHERE YEAR(dateHeureInc) = 2024 GROUP BY nomForet;
SELECT nomVille, SUM(superficieBrulee) FROM Ville V, Foret F, Incendie I WHERE V.codeVille = F.codeVille AND F.codeForet = I.codeForet AND YEAR(dateHeureInc) = 2023 AND MONTH(dateHeureInc) >= 6 AND MONTH(dateHeureInc) <= 8 GROUP BY nomVille;
SELECT DISTINCT Incendie.codeInc, dateHeureInc FROM Incendie INNER JOIN Intervention ON Incendie.codeInc = Intervention.codeInc INNER JOIN TypeIntervention ON Intervention.codeTypeInt = TypeIntervention.codeTypeInt WHERE description = 'Aérienne';
SELECT Incendie.codeInc, nomForet, dateHeureInc, COUNT(*) FROM Incendie, Foret, Intervention WHERE Incendie.codeForet = Foret.codeForet AND Incendie.codeInc = Intervention.codeInc GROUP BY Incendie.codeInc, nomForet, dateHeureInc HAVING COUNT(codeInt) >= 3;
SELECT nomForet, superficieForet FROM Foret WHERE superficieForet IN (SELECT MAX(superficieForet) FROM Foret);
