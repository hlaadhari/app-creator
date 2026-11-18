-- Solution SQL Bac Blanc 2024
UPDATE Contenu SET Mode = 'D' WHERE IdChaine = 'C005';
DELETE FROM Contenu WHERE DateCreation < '2017-01-01';
SELECT DISTINCT NomType FROM Contenu C JOIN TypeContenu T ON C.IdType = T.IdType WHERE NbreVues > 1000;
SELECT Titre, Duree, NbreVues FROM Contenu WHERE DateCreation >= '2024-01-01' AND DateCreation <= '2024-12-31' ORDER BY NbreVues DESC;
SELECT DISTINCT IdStream FROM Chaine CH JOIN Contenu CO ON CH.IdChaine = CO.IdChaine JOIN TypeContenu T ON CO.IdType = T.IdType WHERE NomType = 'Education';
SELECT IdChaine, AVG(Duree) AS DureeMoyenne FROM Contenu GROUP BY IdChaine;
