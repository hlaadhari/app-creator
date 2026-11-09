-- =============================================================================
-- Solution officielle : Bac STI 2025 Session de Contrôle (Écrit)
-- =============================================================================

SELECT description, SUM(superficieInt) AS SuperficieTotale FROM TypeIntervention T, Intervention I WHERE T.codeTypeInt = I.codeTypeInt GROUP BY description HAVING SUM(superficieInt) >= 120;
INSERT INTO Intervention (codeInt, dateHeureDebInt, superficieInt, codeTypeInt, codeInc) VALUES ('INT0000017', '2025-06-01 14:00:00', 8.000, 'TI4', 'INC0000010');
SELECT nomForet, superficieForet FROM Foret F, Ville V, Gouvernorat G WHERE F.codeVille = V.codeVille AND V.codeGouv = G.codeGouv AND nomGouv = 'Jendouba';
SELECT nomForet, COUNT(*) AS nbIncendies FROM Foret F, Incendie I WHERE F.codeForet = I.codeForet AND YEAR(dateHeureInc) = 2024 GROUP BY nomForet;
SELECT nomVille, SUM(superficieBrulee) AS totalBrule FROM Ville V, Foret F, Incendie I WHERE V.codeVille = F.codeVille AND F.codeForet = I.codeForet AND dateHeureInc BETWEEN '2023-06-01 00:00:00' AND '2023-08-31 23:59:59' GROUP BY nomVille;
SELECT DISTINCT I.codeInc, dateHeureInc FROM Incendie I, Intervention N, TypeIntervention T WHERE I.codeInc = N.codeInc AND N.codeTypeInt = T.codeTypeInt AND description = 'Aérienne';
SELECT I.codeInc, nomForet, dateHeureInc, COUNT(*) AS nbInterventions FROM Incendie I, Foret F, Intervention N WHERE I.codeForet = F.codeForet AND I.codeInc = N.codeInc GROUP BY I.codeInc, nomForet, dateHeureInc HAVING COUNT(*) >= 3;
SELECT nomForet, superficieForet FROM Foret WHERE superficieForet = (SELECT MAX(superficieForet) FROM Foret);
