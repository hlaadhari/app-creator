-- =============================================================================
-- Solution invalide (erreurs fréquentes d'élèves) : Bac STI 2024 Contrôle
-- =============================================================================

SELECT nomChaine, emailProp FROM Chaine;
SELECT emailUtilis, dateVis FROM Visualisation WHERE idVideo = 2438;
SELECT titreVideo, duree FROM Video V, Chaine C WHERE V.idChaine = C.idChaine AND nomChaine = 'info_Experts';
SELECT dateVis FROM Visualisation WHERE emailUtilis = 'Ch240T';
SELECT COUNT(taille) FROM Video;
SELECT V.idVideo, COUNT(*) AS nbVisualisations FROM VideosTag T, Visualisation V WHERE T.idVideo = V.idVideo AND T.idTag = 7 GROUP BY V.idVideo ORDER BY nbVisualisations DESC;
SELECT idVideo, titreVideo, duree FROM Video WHERE duree > 40;
INSERT INTO Tag (libelleTag) VALUES ('HTMX');
DELETE FROM Chaine WHERE idChaine = 3;
UPDATE Visualisation SET commentaire = '***' WHERE idVideo = 2216 AND commentaire LIKE '%la fin du film%';
ALTER TABLE Video ADD langue VARCHAR;
