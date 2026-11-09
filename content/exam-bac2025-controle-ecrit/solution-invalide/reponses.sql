-- =============================================================================
-- Solution invalide (erreurs fréquentes d'élèves) : Bac STI 2025 Contrôle
-- =============================================================================

SELECT description, SUM(superficieInt) FROM Intervention GROUP BY description;
INSERT INTO Intervention (codeInt, codeTypeInt) VALUES ('INT0000017', 'TI9');
SELECT nomForet FROM Foret;
SELECT nomForet FROM Foret;
SELECT nomVille FROM Ville;
SELECT codeInc FROM Intervention;
SELECT codeInc FROM Intervention GROUP BY codeInc HAVING COUNT(*) > 3;
SELECT nomForet, MAX(superficieForet) FROM Foret;
