-- =============================================================================
-- Solution Alternative : Bac STI 2024 Session Principale (Écrit)
-- =============================================================================

SELECT DISTINCT Vanne.idVan, Vanne.etatVan FROM Vanne INNER JOIN Capteur ON Vanne.idVan = Capteur.idVan WHERE Capteur.refCapt LIKE 'D%';
SELECT Vanne.idVan FROM Vanne WHERE Vanne.idBar = 5 AND Vanne.etatVan = 1;
SELECT DISTINCT C.idCapt, C.refCapt FROM Capteur C INNER JOIN Mesure M ON C.idCapt = M.idCapt INNER JOIN Alerte A ON M.idMes = A.idMes WHERE A.degAlert = 3 AND A.statAlert != 'R';
SELECT B.idBar, B.nomBar, COUNT(V.idVan) AS nbVannes FROM Barrage B LEFT JOIN Vanne V ON B.idBar = V.idBar GROUP BY B.idBar, B.nomBar;
SELECT DISTINCT B.idBar, B.nomBar FROM Barrage B INNER JOIN NiveauEau N ON B.idBar = N.idBar WHERE N.niveau > (0.9 * B.hauteur) AND YEAR(N.dateNiv) = 2024;
SELECT C.idCapt, C.refCapt, MAX(dateMes) FROM Mesure M INNER JOIN Capteur C ON M.idCapt = C.idCapt GROUP BY C.idCapt, C.refCapt HAVING MAX(dateMes) < '2024-02-15';
DELETE FROM Alerte WHERE statAlert = 'R';
UPDATE Mesure SET valMes = valMes - 2 WHERE idCapt = 4 AND dateMes BETWEEN '2024-01-29' AND '2024-02-02';
CREATE TABLE Categorie (idCat INT PRIMARY KEY, nomCat VARCHAR(50));
ALTER TABLE Categorie ADD CONSTRAINT chk_nomCat CHECK (nomCat IN ('débit', 'pression', 'température'));
ALTER TABLE Capteur ADD idCat INT;
ALTER TABLE Capteur ADD FOREIGN KEY (idCat) REFERENCES Categorie(idCat);
