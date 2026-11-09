-- =============================================================================
-- Solution alternative (jointures explicites, sous-requête IN) : Bac STI 2024 Contrôle
-- =============================================================================

SELECT nomChaine, emailProp FROM Chaine;
SELECT emailUtilis, dateVis FROM Visualisation WHERE idVideo = 2438;
SELECT titreVideo, duree FROM Video INNER JOIN Chaine ON Video.idChaine = Chaine.idChaine WHERE nomChaine = 'info_Experts';
SELECT MAX(dateVis) AS derniere FROM Visualisation INNER JOIN Utilisateur ON Visualisation.emailUtilis = Utilisateur.emailUtilis WHERE nomUtilis = 'Ch240T';
SELECT SUM(taille) AS tailleTotale FROM Video INNER JOIN Chaine ON Video.idChaine = Chaine.idChaine WHERE nomChaine = 'info_Experts';
SELECT idVideo, COUNT(idVis) AS nb FROM Visualisation WHERE idVideo IN (SELECT idVideo FROM VideosTag WHERE idTag = 7) GROUP BY idVideo ORDER BY nb DESC;
SELECT V.idVideo, V.titreVideo, V.duree FROM Video V WHERE V.idChaine = 5 AND V.duree > (SELECT AVG(W.duree) FROM Video W WHERE W.idChaine = 5);
INSERT INTO Tag VALUES (NULL, 'HTMX');
DELETE FROM Video WHERE idChaine = 3 ;
UPDATE Visualisation SET commentaire = '***' WHERE commentaire LIKE '%la fin du film%' AND idVideo = 2216;
ALTER TABLE Video ADD COLUMN langue CHAR(2);
