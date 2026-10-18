# Labo STI — Plateforme d'Entraînement Web (Bac STI)

> Plateforme web d'entraînement et d'examen blanc au **Bac STI** (HTML/CSS, JavaScript, PHP, SQL) associant un environnement de développement type VS Code dans le navigateur et un moteur de correction pédagogique en direct.

[![Version](https://img.shields.io/badge/version-3.1--draft-blue.svg)](docs/PRD.md)
[![Stack](https://img.shields.io/badge/stack-TanStack%20Start%20%7C%20Supabase%20%7C%20Tailwind%20v4-emerald.svg)](CONTEXT.md)
[![License](https://img.shields.io/badge/license-MIT%20%2F%20CC%20BY--SA%204.0-orange.svg)](docs/PRD.md)

---

## 📖 Sommaire

- [Présentation](#-présentation)
- [Fonctionnalités Clés](#-fonctionnalités-clés)
- [Architecture & Stack Technique](#-architecture--stack-technique)
- [Documentation de Référence](#-documentation-de-référence)
- [Démarrage Rapide](#-démarrage-rapide)
- [Synchronisation Lovable](#-synchronisation-lovable)
- [Feuille de Route](#-feuille-de-route)

---

## 🎯 Présentation

Labo STI répond aux défis majeurs de l'apprentissage du développement web au lycée :
1. **Zéro Installation** : l'élève code directement dans son navigateur (aucune configuration de serveur Apache, PHP ou MySQL requise sur les postes du lycée).
2. **Correction Immédiate** : évaluation en direct critère par critère (DOM, styles calculés, scripts, logique serveur et bases de données).
3. **Pédagogie Bienveillante** : indices progressifs sur 3 niveaux pour débloquer l'élève sans lui donner la solution brute.
4. **Conditions Réelles d'Examen** : mode examen chronométré avec horloge serveur étanche, format officiel `SW_xxxxx` et snapshots scellés.
5. **Gain de Temps Enseignant** : pré-correction automatique, grille de notation assistée et détection des difficultés d'apprentissage.

---

## ⚡ Fonctionnalités Clés

- **Éditeur type VS Code** : Monaco Editor avec coloration multi-langages, arborescence normalisée et raccourcis usuels.
- **Bac à Sable Sécurisé** : aperçu web live dans une iframe sandbox isolée sans accès réseau ni fuite de cookies.
- **Exécution Locale PHP & SQL (Phase 2)** : exécution in-browser via WebAssembly (PHP WASM Worker + SQLite WASM avec contrôleur de dialecte MySQL).
- **Résilience Maximale (Offline-First)** : tampon local IndexedDB prioritaire, synchronisation asynchrone avec détection des conflits de révision (`rev`).
- **Immuabilité des Sujets** : chaque publication crée une version figée non modifiable (`sujet_versions`), garantissant la pérennité des notes et des rendus d'examen.

---

## 🛠 Architecture & Stack Technique

- **Frontend** : [TanStack Start](https://tanstack.com/start) (React 19, Vite, Nitro), [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/), [Monaco Editor](https://microsoft.github.io/monaco-editor/).
- **Backend & Données** : [Supabase](https://supabase.com) (PostgreSQL avec Row Level Security, Supabase Auth, Storage S3, Realtime).
- **ORM & Migrations** : [Drizzle ORM](https://orm.drizzle.team/) & Migrations SQL versionnées.
- **Tests** : [Vitest](https://vitest.dev/), Testing Library, suite de tests négatifs de sécurité (T-01 à T-14).

---

## 📚 Documentation de Référence

L'ensemble du cadrage et des spécifications est organisé dans le dossier `docs/` et à la racine :

- [`CONTEXT.md`](CONTEXT.md) : **Document maître de contexte** (vision, principes directeurs, analyse d'écart et stack).
- [`docs/PRD.md`](docs/PRD.md) : **Product Requirement Document (v3.1)** exhaustif.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : Détail de l'architecture logicielle, sandboxing, isolation et Plan B.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) : Modèle relationnel complet des 26 tables, triggers d'immuabilité et RLS.
- [`docs/SECURITY.md`](docs/SECURITY.md) : Modèle de menace, politique CSP et spécifications des 14 tests négatifs.
- [`docs/CRITERIA_GUIDE.md`](docs/CRITERIA_GUIDE.md) : **Guide de rédaction des critères pédagogiques** (modèles de tests, règles de tolérance, 3 niveaux d'indices).
- [`roadmap.md`](roadmap.md) : Feuille de route détaillée jalonnée de M0 à M8.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) : Guide de contribution, conventions de commit et workflow.
- [`SECURITY.md`](SECURITY.md) : Politique de signalement de vulnérabilités.
- [`AGENTS.md`](AGENTS.md) : Consignes de pair programming et règles d'or pour agents IA.

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) v20+ ou v22+
- Gestionnaire de paquets `npm` ou `bun`

### Installation Locale

```bash
# 1. Cloner le dépôt
git clone <url-du-depot>
cd app-creator

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
# Créer un fichier .env avec les clés Supabase :
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_PUBLISHABLE_KEY=...

# 4. Lancer le serveur de développement
npm run dev

# 5. Exécuter la suite de tests
npm test
```

---

## 🔄 Synchronisation Lovable

Ce projet est connecté à la plateforme [Lovable](https://lovable.dev).

- Les commits poussés sur la branche `main` sont synchronisés automatiquement avec l'éditeur Lovable.
- **Important** : Ne réécrivez jamais l'historique Git (`git push --force`, rebase de commits publiés) pour préserver l'intégrité de la synchronisation Lovable.

---

## 🗺 Feuille de Route

Le projet se déploie selon 6 phases strictes :
- **Phase 0** : Jalon de validation technique (PHP WASM + SQLite sur poste 4 Go RAM).
- **Phase 1 (MVP)** : Parcours complet élève HTML/CSS/JS (Authentification, Monaco, Tampon local, Critères DOM).
- **Phase 2** : PHP & SQL local (Panneau DB, lint MySQL, réinitialisation).
- **Phase 3** : Correction étendue, indices progressifs et gestion des contestations.
- **Phase 4** : Mode examen blanc, minuteur serveur et snapshots scellés.
- **Phase 5** : Référentiel de compétences, pilotage enseignant et tuteur IA optionnel.

---

## 📄 Licences

- Code source : sous licence [MIT](https://opensource.org/licenses/MIT).
- Sujets et contenus pédagogiques : sous licence [Creative Commons CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
