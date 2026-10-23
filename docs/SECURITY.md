# Modèle de Menace & Sécurité Applicative — Labo STI

> **Source de référence** : PRD v3.1 (§12)  
> **Dernière révision** : 18 octobre 2026

---

## 1. Modèle de Menace (STRIDE & Contexte Éducatif)

Dans le cadre d'un lycée d'enseignement technologique (Bac STI), les vecteurs d'attaque et de triche diffèrent d'une application d'entreprise classique :

| Menace                                | Scénario d'attaque type                                                                                           | Impact potentiel                               | Contre-mesure architecturale                                                                             |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Élève malveillant / curieux**       | Inspection réseau DevTools, tentative de lecture du corrigé avant déblocage, requêtes directes sur l'API Supabase | Fuite du corrigé, triche généralisée           | Aucune solution ni critère masqué n'a de `GRANT` client ; vérification côté serveur ou RPC dédiée        |
| **Usurpation d'identité**             | Élève A accédant au travail de l'Élève B ou modifiant ses notes                                                   | Corruption de notation, litige                 | RLS Postgres stricte (`auth.uid() = eleve_id`), isolation totale                                         |
| **Élévation de privilèges**           | Auto-attribution du rôle `enseignant` ou `admin` lors de l'inscription                                            | Prise de contrôle de classes                   | Validation manuelle des enseignants par un admin (`profiles.valide_par`), rôle `eleve` forcé par trigger |
| **Code élève hostile / défaillant**   | Boucle infinie `while(true)`, allocation de tableaux géants, tentative d'accès au `window.parent`                 | Crash du navigateur, vol de cookies de session | Iframe sandbox sans `allow-same-origin`, Web Worker isolé avec watchdog 3s                               |
| **Manipulation temporelle en examen** | Modification de l'horloge système de l'ordinateur portable pour dépasser la durée                                 | Soumission hors délai                          | Le temps est comptabilisé et vérifié **exclusivement par le serveur** (`echeance_serveur`)               |
| **Pénétration d'examen**              | Rejoindre un examen en devinant un code d'invitation                                                              | Intrusion non autorisée                        | Codes à entropie suffisante, dates d'expiration, révocation manuelle, rate-limiting                      |
| **Fuite de secrets d'infrastructure** | Clé `service_role` Supabase ou clé IA intégrée dans le build frontend                                             | Compromission totale de la base                | Variables `SUPABASE_SERVICE_ROLE_KEY` confinées aux fonctions SSR/Edge, test négatif CI                  |
| **Protection des données de mineurs** | Fuite de données personnelles ou de logs contenant des noms d'élèves                                              | Infraction RGPD                                | Données minimisées (nom, prénom, classe), pas de tracking tiers, purge de fin d'année scolaire           |

---

## 2. Spécification des 14 Tests Négatifs Obligatoires (T-01 à T-14)

Chaque test négatif doit être implémenté sous forme d'un test automatisé en CI (Vitest / Playwright) s'exécutant avec des contextes de connexion distincts :

- `Client Élève A` (authentifié)
- `Client Élève B` (authentifié)
- `Client Enseignant A` (authentifié)
- `Client Enseignant B` (authentifié)
- `Client Anonyme` (non authentifié)

| ID       | Intitulé & Description Technique                                                                                                                         | Niveau de Priorité | Mécanisme de Vérification                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **T-01** | **Isolation inter-élèves** : Élève A exécute un `select * from projets where eleve_id = B` et des requêtes Storage sur les fichiers de B.                | **MVP (Phase 1)**  | Rejet SQL `RLS policy error` ou tableau vide `[]`.                                                                             |
| **T-02** | **Isolation inter-enseignants** : Enseignant A tente d'accéder aux classes, sujets non publiés ou notes d'Enseignant B.                                  | **MVP (Phase 1)**  | RLS vérifiant la propriété `classes.enseignant_id = auth.uid()`.                                                               |
| **T-03** | **Interdiction d'auto-attribution de rôle** : L'inscription injecte `role: 'enseignant'` dans les métadonnées auth ou tente un `insert into user_roles`. | **MVP (Phase 1)**  | Le trigger `handle_new_user` écrase toute valeur et impose `'eleve'` ; le `grant` en écriture sur `user_roles` est inexistant. |
| **T-04** | **Confidentialité des corrigés** : Requête client directe sur `public.solutions` ou `criteres` où `masque = true`.                                       | **Phase 3**        | Rejet immédiat par absence de permissions Postgres (`permission denied for table solutions`).                                  |
| **T-05** | **Rejet des invitations invalides** : Test d'un code expiré, révoqué ou tentative de bruteforce (10 codes invalides consécutifs).                        | **MVP (Phase 1)**  | Code refusé, blocage temporaire par rate-limiter.                                                                              |
| **T-06** | **Refus d'écriture après échéance d'examen** : Envoi d'une modification de fichier avec une horloge client falsifiée après `echeance_serveur`.           | **Phase 4**        | La fonction RPC serveur ou la politique RLS vérifie `now() <= echeance_serveur` et lève une exception.                         |
| **T-07** | **Transitions d'états d'examen invalides** : Tentative de passer un `passage_examen` de `rendu` à `en_cours`.                                            | **Phase 4**        | Trigger de validation de machine à états ou fonction serveur dédiée.                                                           |
| **T-08** | **Immuabilité des snapshots** : Tentative de `UPDATE` ou `DELETE` sur un enregistrement de la table `snapshots`.                                         | **Phase 4**        | Trigger Postgres levant une exception `Snapshot immuable`.                                                                     |
| **T-09** | **Immuabilité des versions publiées** : Tentative de mise à jour d'un énoncé ou suppression d'un critère sur une version où `publiee = true`.            | **MVP (Phase 1)**  | Validé par le trigger `protect_published_version` déjà actif.                                                                  |
| **T-10** | **Confinement des ressources du code élève** : Exécution d'un script contenant `while(true) {}` ou allocation d'un buffer massif.                        | **MVP (Phase 1)**  | Watchdog de l'iframe / Web Worker interrompant l'exécution sous 3 s sans figer l'interface.                                    |
| **T-11** | **Confinement réseau du bac à sable** : Exécution de `fetch('https://evil.com')` ou lecture de `document.cookie` depuis l'iframe élève.                  | **MVP (Phase 1)**  | Échec de la requête réseau (CSP / sandbox) et `document.cookie` inaccessible / vide.                                           |
| **T-12** | **Absence de secrets dans le build client** : Analyse statique du bundle produit par `npm run build` et recherche de `service_role` ou clés privées.     | **MVP (Phase 1)**  | Script CI de scanning échouant si une clé sensible apparaît dans `dist/`.                                                      |
| **T-13** | **Absence de données sensibles dans la télémétrie** : Déclenchement d'une erreur applicative et inspection du payload envoyé.                            | **MVP (Phase 1)**  | Assertion vérifiant l'absence de code élève et de données PII dans les logs Sentry/Lovable.                                    |
| **T-14** | **Conformité RGPD suppression de compte** : Appel de la procédure de purge de compte élève.                                                              | **MVP (Phase 1)**  | Suppression en cascade ou anonymisation irréversible des traces.                                                               |

---

## 3. Matrice de Permissions RLS (PostgreSQL)

| Table               | Rôle Anonyme (`anon`) | Rôle Élève (`eleve`)                  | Rôle Enseignant (`enseignant`)                      | Service Role (`service_role`) |
| ------------------- | --------------------- | ------------------------------------- | --------------------------------------------------- | ----------------------------- |
| `profiles`          | Aucun                 | Lecture / MAJ propre profil           | Lecture élèves de ses classes                       | Accès total                   |
| `user_roles`        | Aucun                 | Lecture ses rôles                     | Lecture ses rôles                                   | Accès total                   |
| `classes`           | Aucun                 | Lecture ses classes                   | CRUD ses propres classes                            | Accès total                   |
| `class_invitations` | Aucun                 | Utilisation via RPC                   | CRUD pour ses classes                               | Accès total                   |
| `sujets`            | Lecture publique      | Lecture publique                      | Lecture publique + CRUD ses brouillons              | Accès total                   |
| `sujet_versions`    | Lecture si publiée    | Lecture si publiée                    | Lecture si publiée + CRUD ses versions non publiées | Accès total                   |
| `criteres`          | **Aucun**             | Lecture via RPC / après déblocage     | Lecture/écriture sur ses versions non publiées      | Accès total                   |
| `solutions`         | **Aucun**             | **Aucun**                             | Lecture sur ses sujets                              | Accès total                   |
| `indices`           | Aucun                 | Lecture si débloqué (RPC)             | Lecture tous ses sujets                             | Accès total                   |
| `projets`           | Aucun                 | CRUD ses propres projets              | Lecture projets de ses élèves                       | Accès total                   |
| `projet_fichiers`   | Aucun                 | CRUD ses propres fichiers             | Lecture fichiers de ses élèves                      | Accès total                   |
| `tentatives`        | Aucun                 | Insertion / Lecture ses tentatives    | Lecture tentatives de ses élèves                    | Accès total                   |
| `snapshots`         | Aucun                 | Lecture ses snapshots                 | Lecture snapshots de ses élèves                     | Accès total                   |
| `sessions_examen`   | Aucun                 | Lecture si inscrit                    | CRUD ses propres sessions                           | Accès total                   |
| `passages_examen`   | Aucun                 | Lecture son passage                   | Lecture/MAJ passage de sa session                   | Accès total                   |
| `notes`             | Aucun                 | Lecture note finale après publication | CRUD notes de ses élèves                            | Accès total                   |

---

## 4. Politique de Sécurité du Contenu (CSP) & En-têtes HTTP

Les en-têtes HTTP de sécurité sont déclarés dans [`vercel.json`](../vercel.json) et servis sur toutes les routes (`/(.*)`) :

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data: https://cdn.jsdelivr.net; frame-src 'self' blob: data:; worker-src 'self' blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net; object-src 'none'; base-uri 'self'; frame-ancestors 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

- L'en-tête obsolète `X-XSS-Protection` est volontairement omis conformément aux recommandations OWASP et MDN.
- _(Remarque : `Cross-Origin-Embedder-Policy: require-corp` et `Cross-Origin-Opener-Policy: same-origin` ne sont requis que dans le cas d'un futur recours à `SharedArrayBuffer` pour des runtimes WebAssembly multi-threads)._
