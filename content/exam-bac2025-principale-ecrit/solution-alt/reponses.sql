-- =============================================================================
-- Solution alternative (jointures explicites, LEFT JOIN, IN, BETWEEN) : Bac STI 2025 Principale
-- =============================================================================

SELECT codeType, libType FROM Type_Manif;
SELECT codeManif, nomManif, dateOuv FROM Manifestation WHERE DATEDIFF(dateFer, dateOuv) <= 4;
UPDATE Location SET prix=prix*0.85 WHERE codeManif='M0001';
SELECT DISTINCT nomCl, telCl, emailCl FROM Client INNER JOIN Location ON Client.codeCl = Location.codeCl;
SELECT codeStand, designation, superficie FROM Stand INNER JOIN Halle ON Stand.codeHalle = Halle.codeHalle WHERE libHalle = 'Halle A' AND etat = 'L' ORDER BY superficie DESC;
SELECT T.codeType, T.libType, COUNT(M.codeManif) FROM Type_Manif T LEFT JOIN Manifestation M ON T.codeType = M.codeType GROUP BY T.codeType, T.libType;
SELECT Manifestation.codeManif, nomManif, SUM(prix) FROM Manifestation INNER JOIN Location ON Manifestation.codeManif = Location.codeManif GROUP BY Manifestation.codeManif, nomManif HAVING SUM(prix) > 10000;
SELECT designation FROM Stand WHERE codeStand NOT IN (SELECT codeStand FROM Location WHERE dateLoc BETWEEN '2025-01-01' AND '2025-12-31');
SELECT Stand.codeStand, designation, superficie FROM Stand INNER JOIN Location ON Stand.codeStand = Location.codeStand WHERE prix IN (SELECT MAX(prix) FROM Location);
