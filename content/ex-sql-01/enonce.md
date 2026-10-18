# Commandes LDD & Contraintes d'Intégrité (SQL)

## Contexte

Dans le cadre de la gestion automatisée d'un laboratoire de sciences et technologies industrielles, les relevés des capteurs environnementaux doivent être archivés dans une base de données relationnelle MySQL/MariaDB.

La table des capteurs est déjà définie :

```sql
CREATE TABLE capteur (
  id_capteur INT AUTO_INCREMENT PRIMARY KEY,
  designation VARCHAR(50) NOT NULL,
  salle VARCHAR(20) NOT NULL
);
```

---

## Consignes

Dans le fichier `schema.sql`, écrivez l'instruction de création en Langage de Définition de Données (LDD) de la table `mesure` répondant au cahier des charges suivant :

1. **Champs de la table `mesure`** :
   - `id_mesure` : Entier (`INT`), auto-incrémenté, constituant la **clé primaire** (`PRIMARY KEY`).
   - `id_capteur` : Entier (`INT`), obligatoire (`NOT NULL`).
   - `valeur` : Nombre décimal (`DECIMAL(6,2)` ou `FLOAT`), obligatoire (`NOT NULL`).
   - `date_mesure` : Horodatage (`DATETIME`), avec pour valeur par défaut la date/heure courante (`DEFAULT CURRENT_TIMESTAMP`).

2. **Clé Étrangère (`FOREIGN KEY`)** :
   - Le champ `id_capteur` fait référence à la clé primaire `id_capteur` de la table `capteur` (`REFERENCES capteur(id_capteur)`).

3. **Contrainte de Domaine (`CHECK`)** :
   - La valeur mesurée doit être comprise entre **-50** et **150** degrés inclus (`CHECK (valeur >= -50 AND valeur <= 150)` ou `CHECK (valeur BETWEEN -50 AND 150)`).
