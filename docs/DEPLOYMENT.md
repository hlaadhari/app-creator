# Guide de Déploiement Vercel — Sprout Workshop (Labo STI)

> **Plateforme cible** : [Vercel](https://vercel.com)  
> **Type d'application** : TanStack Start + Nitro SSR / Client Vite  
> **Dernière mise à jour** : 18 octobre 2026

---

## 1. Deux Méthodes de Déploiement

Vous avez le choix entre **deux approches** complémentaires :

### Méthode A : Intégration Native Vercel (Recommandée)

L'intégration directe via le tableau de bord Vercel est la plus simple et la plus robuste :

- Chaque `git push` sur `main` déclenche un déploiement en **Production**.
- Chaque **Pull Request** génère automatiquement une URL de **Preview** éphémère avec commentaires automatiques.
- Prise en charge native du fichier [`vercel.json`](../vercel.json).

### Méthode B : Déploiement Automatisé via GitHub Actions

Le workflow [`.github/workflows/deploy-vercel.yml`](../.github/workflows/deploy-vercel.yml) permet de gérer le déploiement directement depuis vos pipelines GitHub Actions.

- Le workflow est sécurisé et conditionné par le secret `VERCEL_TOKEN` (il n'échoue pas si le secret n'est pas encore renseigné).

---

## 2. Configuration du Projet sur Vercel (Dashboard)

1. Rendez-vous sur [vercel.com/new](https://vercel.com/new).
2. Importez le dépôt GitHub : **`hlaadhari/app-creator`**.
3. Définissez les paramètres de build :

| Paramètre            | Valeur                              | Explication                                                   |
| :------------------- | :---------------------------------- | :------------------------------------------------------------ |
| **Framework Preset** | `Other`                             | TanStack Start s'appuie sur Nitro et le Build Output API v3.  |
| **Build Command**    | `NITRO_PRESET=vercel bun run build` | Compile l'application avec le preset Nitro Vercel optimisé.   |
| **Install Command**  | `bun install`                       | Installation rapide via Bun respectant le fichier `bun.lock`. |
| **Output Directory** | `.vercel/output`                    | Géré automatiquement via l'API v3 Vercel.                     |

---

## 3. Variables d'Environnement sur Vercel

Dans **Project Settings > Environment Variables**, ajoutez les clés suivantes pour les environnements _Production_, _Preview_ et _Development_ :

```env
# URL et clé publique Supabase (obligatoires pour le fonctionnement du client)
VITE_SUPABASE_URL = "https://dxanlvsonydghkmycexq.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6oy2IYNYBkyKr0umKULwVw_vy7bVVIZ"

# Côté serveur SSR / Nitro
SUPABASE_URL = "https://dxanlvsonydghkmycexq.supabase.co"
SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6oy2IYNYBkyKr0umKULwVw_vy7bVVIZ"

# Preset Nitro
NITRO_PRESET = "vercel"
```

> [!WARNING]
> Ne configurez **JAMAIS** `SUPABASE_SERVICE_ROLE_KEY` en tant que variable préfixée par `VITE_`. Seules les clés de rôle public/anonyme sont autorisées dans le client.

---

## 4. Configuration GitHub Actions (Si Méthode B choisie)

Si vous souhaitez utiliser le workflow GitHub Actions [`.github/workflows/deploy-vercel.yml`](../.github/workflows/deploy-vercel.yml) :

1. Créez un token d'accès personnel sur Vercel : **Settings > Tokens > Create Token**.
2. Dans votre dépôt GitHub : **Settings > Secrets and variables > Actions**.
3. Ajoutez le secret :
   - `VERCEL_TOKEN` : Votre token Vercel.
   - `VERCEL_ORG_ID` : L'identifiant de votre équipe/compte Vercel (trouvé dans `.vercel/project.json` après un `vercel link`).
   - `VERCEL_PROJECT_ID` : L'identifiant du projet Vercel.

---

## 5. En-têtes de Sécurité & Performance ([`vercel.json`](../vercel.json))

Le fichier [`vercel.json`](../vercel.json) injecte automatiquement les en-têtes conformes aux exigences de sécurité du PRD v3.1 :

- **Anti-Clickjacking** : `X-Frame-Options: SAMEORIGIN` sur l'application hôte.
- **MIME Sniffing Protection** : `X-Content-Type-Options: nosniff`.
- **Politique de Référent** : `Referrer-Policy: strict-origin-when-cross-origin`.
- **Cache CDN Immuable** : `Cache-Control: public, max-age=31536000, immutable` sur tous les assets statiques compilés (`/assets/*`).
