-- =============================================================================
-- Solution officielle : Bac STI 2024 Session de Contrôle (Écrit)
-- =============================================================================

SELECT nomChaine, emailProp FROM Chaine;
SELECT emailUtilis, dateVis FROM Visualisation WHERE idVideo = 2438;
SELECT titreVideo, duree FROM Video V, Chaine C WHERE V.idChaine = C.idChaine AND nomChaine = 'info_Experts';
SELECT MAX(dateVis) FROM Visualisation V, Utilisateur U WHERE V.emailUtilis = U.emailUtilis AND nomUtilis = 'Ch240T';
SELECT SUM(taille) FROM Video V, Chaine C WHERE V.idChaine = C.idChaine AND nomChaine = 'info_Experts';
SELECT V.idVideo, COUNT(*) AS nbVisualisations FROM VideosTag T, Visualisation V WHERE T.idVideo = V.idVideo AND T.idTag = 7 GROUP BY V.idVideo ORDER BY nbVisualisations DESC;
SELECT idVideo, titreVideo, duree FROM Video WHERE idChaine = 5 AND duree > (SELECT AVG(duree) FROM Video WHERE idChaine = 5);
INSERT INTO Tag (libelleTag) VALUES ('HTMX');
DELETE FROM Video WHERE idChaine = 3;
UPDATE Visualisation SET commentaire = '***' WHERE idVideo = 2216 AND commentaire LIKE '%la fin du film%';
ALTER TABLE Video ADD langue CHAR(2);
