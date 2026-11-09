-- =============================================================================
-- Solution officielle : Bac STI 2025 Session Principale (Écrit)
-- =============================================================================

SELECT codeType, libType FROM Type_Manif;
SELECT codeManif, nomManif, dateOuv FROM Manifestation WHERE DATEDIFF(dateFer, dateOuv) < 5;
UPDATE Location SET prix = prix * 0.85 WHERE codeManif = 'M0001';
SELECT DISTINCT nomCl, telCl, emailCl FROM Client C, Location L WHERE C.codeCl = L.codeCl;
SELECT codeStand, designation, superficie FROM Stand S, Halle H WHERE S.codeHalle = H.codeHalle AND libHalle = 'Halle A' AND etat = 'L' ORDER BY superficie DESC;
SELECT T.codeType, libType, COUNT(codeManif) AS nbManifestations FROM Type_Manif T, Manifestation M WHERE T.codeType = M.codeType GROUP BY T.codeType, libType;
SELECT M.codeManif, nomManif, SUM(prix) AS totalRevenus FROM Manifestation M, Location L WHERE M.codeManif = L.codeManif GROUP BY M.codeManif, nomManif HAVING SUM(prix) > 10000;
SELECT designation FROM Stand WHERE codeStand NOT IN (SELECT codeStand FROM Location WHERE YEAR(dateLoc) = 2025);
SELECT S.codeStand, designation, superficie FROM Stand S, Location L WHERE S.codeStand = L.codeStand AND prix = (SELECT MAX(prix) FROM Location);
