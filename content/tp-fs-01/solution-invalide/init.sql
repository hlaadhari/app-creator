-- Schéma invalide : omet la clé primaire et les contraintes CHECK
CREATE TABLE don (
  id INT,
  nom VARCHAR(60),
  qte INT,
  montant DECIMAL(10,2)
);
