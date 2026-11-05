-- =============================================================================
-- Solution Invalide : Bac STI 2023 Session de Contrôle (Écrit)
-- =============================================================================

SELECT * FROM Seisme;
ALTER TABLE Seisme DROP degat;
DELETE FROM Seisme WHERE magnitude > 10;
UPDATE LieuSeisme SET longitude = 0;
INSERT INTO Ville VALUES ('AFN223', 'Hatay', 'ERR');
