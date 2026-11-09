-- =============================================================================
-- Solution invalide (erreurs fréquentes d'élèves) : Bac STI 2025 Principale
-- =============================================================================

SELECT libType FROM Type_Manif;
SELECT codeManif, nomManif, dateOuv FROM Manifestation;
UPDATE Location SET prix = prix * 0.15 WHERE codeManif = 'M0001';
SELECT nomCl, telCl, emailCl FROM Client;
SELECT codeStand, designation, superficie FROM Stand ORDER BY superficie;
SELECT codeType, COUNT(*) FROM Manifestation GROUP BY codeType;
SELECT codeManif, SUM(prix) FROM Location GROUP BY codeManif;
SELECT designation FROM Stand WHERE etat = 'L';
SELECT codeStand, designation, superficie FROM Stand;
