# Setup Webmedia — Guide d'installation

Ce guide explique comment activer la plateforme Webmedia sur TimeBlast. Compte 10-15 minutes.

---

## 1. Créer un nouveau projet Supabase

1. Va sur https://supabase.com/dashboard
2. Clique **New project**
3. Renseigne :
   - **Name** : `timeblast-webmedia`
   - **Database password** : un mot de passe fort (garde-le en sécurité)
   - **Region** : `Europe West (Ireland)` (ou France si dispo)
   - **Plan** : Free pour démarrer
4. Attends ~2 min que le projet soit provisionné
5. Une fois prêt, va dans **Settings → API** et copie :
   - **Project URL** (ex: `https://abcdxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (longue chaîne commençant par `eyJ...`)

## 2. Exécuter le SQL dans le projet Webmedia

1. Dans le dashboard du nouveau projet, ouvre **SQL Editor**
2. Clique **New query**
3. Copie le contenu complet de `migrations/webmedia_tables.sql`
4. Colle dans l'éditeur → **Run**
5. Tu devrais voir "Success. No rows returned" + des données seed insérées (6 tables `wm_*` créées avec 10+ acheteurs, 25 campagnes, 28 leads, etc.)

## 3. Connecter Webmedia à TimeBlast

### 3a. Enregistrer l'environnement dans la base master

1. Ouvre `migrations/webmedia_master_env.sql`
2. Remplace `<URL_NOUVEAU_PROJET_WEBMEDIA>` par la Project URL copiée à l'étape 1
3. Ouvre le SQL Editor de ton projet Supabase **principal** (SRA — `ldeoqrafauwdgrpbyfyx`)
4. Colle le SQL modifié → **Run**

### 3b. Ajouter la clé Supabase Webmedia dans le frontend

1. Ouvre `src/contexts/EnvContext.jsx`
2. Dans le bloc `ENV_KEYS` (ligne 8-11), ajoute une nouvelle ligne avec ton URL + anon key Webmedia :

```js
const ENV_KEYS = {
  'https://ldeoqrafauwdgrpbyfyx.supabase.co': import.meta.env.VITE_SUPABASE_ANON_KEY,
  'https://cozqovnmqvttmymozwto.supabase.co': 'eyJhbGci...existing...',
  'https://TON_URL_WEBMEDIA.supabase.co': 'TON_ANON_KEY_WEBMEDIA',  // ← NOUVEAU
}
```

## 4. Build & Deploy

```bash
npx vite build
git add .
git commit -m "feat: plateforme Webmedia integree"
git push
```

Vercel déploiera automatiquement.

## 5. Utilisation

1. Connecte-toi à TimeBlast
2. Dans le sélecteur d'environnement (TopBar), tu devrais voir **Webmedia** disponible
3. Clique dessus → l'URL devient `/2026001/...`
4. La sidebar affiche la section **🎯 Webmedia** avec 8 sous-menus
5. La section **Webmedia** n'est visible QUE dans cet env (elle disparaît si tu reviens dans SRA)

## Structure des données

| Table | Rôle |
|-------|------|
| `wm_campaigns` | Campagnes d'acquisition par levier (Meta, Google, SMS, Jeux concours, Lemlist, LinkedIn, Autres) |
| `wm_leads` | Leads générés/achetés/vendus avec statut et thématique |
| `wm_buyer_clients` | Clients acheteurs de leads (top 14 déjà seedés depuis le pptx) |
| `wm_lead_sales` | Ventes de leads (lead → acheteur → prix) |
| `wm_lead_purchases` | Achats de leads depuis sources externes |
| `wm_invoices` | Factures émises aux acheteurs |

## Accès utilisateurs Webmedia

Pour donner accès à l'env Webmedia à d'autres utilisateurs, ajoute-les dans `user_environments` (via admin ou SQL direct) :

```sql
INSERT INTO user_environments (user_id, environment_id, role)
SELECT
  (SELECT id FROM auth.users WHERE email = 'user@webmedia.fr'),
  (SELECT id FROM environments WHERE env_code = '2026001'),
  'manager';  -- ou 'admin'
```

## Support

En cas de problème, vérifier en ordre :
1. Les tables existent dans le projet Supabase Webmedia
2. La ligne `environments` existe dans la base master avec le bon `supabase_url`
3. `ENV_KEYS` dans `EnvContext.jsx` contient bien l'URL Webmedia
4. `user_environments` contient ta liaison

Si le switch env ne marche pas : dev tools console → regarder les erreurs Supabase (401/403 → clé incorrecte, 404 → table manquante).
