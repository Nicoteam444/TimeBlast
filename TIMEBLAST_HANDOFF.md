# Timeblast — Handoff complet pour Claude Code

> **Lis ce document en entier avant toute action.** Il contient le contexte, les décisions, l'architecture, et le plan d'exécution de Timeblast. Les fichiers référencés existent dans ce repo.

---

## Partie 1 — Le contexte métier

### 1.1 Qu'est-ce que Timeblast

Timeblast est un **observatoire universel des flux opérationnels pour entreprises de négoce et de production**. L'outil consolide, normalise et visualise en temps réel les données business de multiples sources (SaaS, ERP, régies publicitaires), les enrichit par IA, et les restitue via une interface conversationnelle hautement customisable.

**Positionnement** : ce n'est PAS un BI générique ni un outil vertical. C'est une couche d'abstraction universelle qui s'adapte à n'importe quel business de trading ou production.

**Exemples d'usage** :
- Lead gen agency (premier cas d'usage, Webmedia) : Meta/Google Ads → LeadByte → Dolibarr
- Grossiste robinetterie : Fournisseurs → Stock → Commandes clients → Facturation
- ESN / service : Recrutement → Assignation → Mission → Facturation

### 1.2 Premier client interne : Webmedia

**Profil** : agence de négoce de leads. Achète du trafic via Meta Ads et Google Ads, capte des leads via des landing pages et formulaires Meta Lead Ads, valide et route les leads via LeadByte, encaisse et facture via Dolibarr.

**Besoin** : un dashboard unifié qui montre en temps réel le cycle complet **ad spend → lead capté → lead vendu → facturation → marge réelle**. C'est le chaînon manquant aujourd'hui sur le marché.

### 1.3 Infrastructure

Tout est hébergé chez **Hexagram**, filiale d'hébergement appartenant au même groupe. Pas de dépendance aux hyperscalers US. Argument commercial fort : souveraineté française/européenne, conformité RGPD native.

La seule sortie externe : AWS Bedrock région `eu-west-3` (Paris) pour les appels Claude, consommés via API avec tokens facturés à l'usage. Pas de GPU self-hosted pour l'instant.

---

## Partie 2 — Les décisions d'architecture prises

### 2.1 Stack technique

| Couche | Choix | Raison |
|---|---|---|
| Orchestration | Docker Swarm | Plus simple que k8s, suffisant à notre échelle V1 |
| Reverse proxy | Traefik v3 | TLS auto, config déclarative, intégration Swarm native |
| Frontend | Next.js 15 (App Router) | Streaming natif, AI SDK compat |
| UI | shadcn/ui + Tailwind + Tremor + Framer Motion | 100% customisable, pas de lock-in AGPL |
| Agents IA | Mastra (TypeScript) | Stack 100% TS, plus léger que LangGraph |
| LLM | Claude Sonnet 4.5 via AWS Bedrock EU | Plus puissant que Mistral, reste en zone EU |
| Semantic layer | Cube.dev OSS | Évite 6-10 mois de dev du moteur SQL+sémantique |
| DB opérationnelle | PostgreSQL 17 | Référence, support natif des JSONB et RLS |
| DB analytique | ClickHouse 24 | Temps réel sur gros volumes |
| Cache / queues | Redis 7 | Classique, éprouvé |
| Vector DB | Qdrant 1.12 | Self-hostable EU, perf solide |
| Stockage objet | MinIO | S3-compat, self-host |
| Ingestion | Nango self-hosted | Conçu pour SaaS-to-SaaS, OAuth clean |
| Jobs asynchrones | Inngest self-hosted | Event-driven moderne |
| Observabilité | Grafana + Prometheus + Loki + Tempo | Stack standard, tout self-hosted |
| Sécurité | CrowdSec (WAF/IDS) + Infisical (secrets) | Solutions françaises quand possible |

### 2.2 Pourquoi ces choix et pas d'autres

**Pourquoi on a écarté Metabase** : licence AGPL bloquante pour embedding dans un SaaS commercial. On a basculé vers un front custom Next.js + shadcn pour avoir du 100% configurable et pas de lock-in licence.

**Pourquoi on n'utilise pas MCP comme couche unique d'ingestion** : MCP est un protocole d'accès à la demande, pas une architecture de données. On a besoin de persistance, d'historique, de streaming temps réel. MCP complète (pour les requêtes à la demande depuis les agents) mais ne remplace pas la pipeline ingestion + normalisation + stockage.

**Pourquoi Cube.dev et pas un SQL custom** : construire un moteur sémantique maison représente 7-10 mois de dev senior. Cube le fait out-of-the-box avec gestion du cache, pre-agrégations, multi-warehouse support, MCP natif, et multi-tenant security context. Notre valeur ajoutée doit être sur la couche IA, pas sur la plomberie.

**Pourquoi Claude via Bedrock et pas Mistral** : Claude Sonnet 4.5 surpasse Mistral Large sur les tâches agentiques complexes (tool use, raisonnement multi-étapes). Bedrock EU garantit la résidence UE des données. On reste capable de switcher si besoin via une abstraction côté Mastra.

**Pourquoi Docker Swarm et pas k3s** : plus simple, plus rapide à maintenir pour une équipe qui démarre. Si on doit scale horizontalement au-delà de 20 nœuds, on migrera vers k3s, mais pas avant.

### 2.3 Le modèle canonique universel

C'est **LA décision structurante** de Timeblast. Plutôt que d'avoir un modèle CRM-centric (Deal, Contact, Activity), on a un modèle **générique à 6 entités** qui fonctionne pour tout business de négoce/production :

| Entité | Rôle | Typé via |
|---|---|---|
| `items` | Unité qui flue dans le business | `item_type` (lead, product, service_hour...) |
| `parties` | Acteur externe ou interne | `party_type` (supplier, buyer, customer, employee) |
| `sources` | Origine d'acquisition | `source_type` (ad_campaign, supplier_feed, internal) |
| `flows` | Événement du cycle de vie | `flow_type` (capture, validation, allocation, delivery, invoice, payment) |
| `transactions` | Fait financier | `transaction_type` (invoice_out, payment_in, commission, refund) |
| `costs` | Coût attribué | `cost_type` (ad_spend, purchase, labor, overhead) |

Chaque entité a une colonne `custom_fields` JSONB pour accueillir les spécificités verticales sans casser le modèle.

**Exemple de mapping Webmedia** :
- Lead Meta Ads → `items` (item_type=lead) + `sources` (source_type=ad_campaign, channel=meta_ads)
- Lead LeadByte supplier → `items` + `sources` (source_type=supplier_feed)
- Supplier/Buyer LeadByte → `parties` (party_type=supplier|buyer)
- Client Dolibarr → `parties` (party_type=customer)
- Facture Dolibarr → `transactions` (transaction_type=invoice_out)
- Dépense Meta Ads → `costs` (cost_type=ad_spend)

Voir le fichier `packages/cube-schema/model.yml` pour l'implémentation Cube.dev complète.

### 2.4 Les 5 agents IA cibles

1. **Agent NLQ (Natural Language Query)** — traduit les questions en langage naturel en requêtes Cube, exécute, formate
2. **Agent Entity Resolution** — fusionne les entités identiques provenant de sources différentes
3. **Agent Anomaly Detector** — scan continu, détecte dérives, pousse alertes
4. **Agent Insight Generator** — briefings proactifs (daily/weekly)
5. **Agent Schema Mapper** — lors de l'ajout d'un connecteur, propose le mapping vers le modèle canonique

Un premier agent NLQ est déjà squelettisé dans `packages/agents/src/nlq-agent.ts`.

### 2.5 Les 4 connecteurs prioritaires pour Webmedia

| Ordre | Connecteur | Complexité | Time-to-prod |
|---|---|---|---|
| 1 | **LeadByte** (lead distribution platform) | Faible — API REST avec API key | 1 semaine |
| 2 | **Dolibarr** (ERP/CRM open source, facturation) | Moyenne — API REST user-dépendante | 1-2 semaines |
| 3 | **Google Ads** (acquisition publicitaire) | Élevée — OAuth + Developer Token | 2-3 semaines + approval |
| 4 | **Meta Ads + Lead Ads Forms** (acquisition + leads) | Très élevée — App Review Meta | 3-4 semaines + review |

**Action urgente critique** : lancer dès que possible l'App Review Meta pour la permission `leads_retrieval`. C'est le chemin critique le plus long, 2-4 semaines d'attente potentielle.

---

## Partie 3 — Ce qui a déjà été créé (à trouver dans ce repo)

### 3.1 Documentation

- `docs/ARCHITECTURE.md` — document maître de référence, tout ce qui a été décidé
- `docs/WORKFLOW.md` — le process Claude Code pour travailler sur Timeblast

### 3.2 Infrastructure

- `infra/docker-compose.yml` — stack Docker Swarm complète, ~470 lignes, ready pour déploiement Hexagram
- Inclut : Traefik, PostgreSQL, ClickHouse, Redis, MinIO, Qdrant, Cube.dev + Cubestore, Nango, Inngest, app Next.js, Prometheus, Grafana, Loki, CrowdSec
- Variables à adapter : domaines (`*.timeblast.hexagram.fr`), chemins de stockage (`/mnt/hexagram/timeblast/`), secrets Docker

### 3.3 Semantic layer

- `packages/cube-schema/model.yml` — les 6 cubes canoniques + 3 views (pnl_universal, acquisition_performance, operational_funnel)

### 3.4 Agents

- `packages/agents/src/nlq-agent.ts` — premier agent Mastra complet, avec tools typés Zod, isolation tenant par défense en profondeur, prompt système cadré

### 3.5 Configuration Claude Code

- `.claude/CLAUDE.md` — constitution projet concise
- `.claude/agents/` — 6 subagents : architect, implementer, security-reviewer, explorer, qa-engineer, code-reviewer
- `.claude/skills/` — 3 skills : new-connector, new-mastra-agent, new-cube-entity
- `.claude/commands/` — 2 slash commands : plan-feature, ship-feature
- `.claude/rules/multi-tenant-safety.md` — règles critiques d'isolation
- `.claude/settings.json` — hooks et permissions

---

## Partie 4 — Ce qu'il reste à faire (par ordre)

### Phase 0 — Setup projet (semaine 1)

1. Créer la structure monorepo pnpm + Turborepo
2. Créer les packages : `apps/web`, `apps/worker`, `packages/agents`, `packages/cube-schema`, `packages/db`, `packages/connectors`, `packages/ui`
3. Setup TypeScript strict, Biome (ou ESLint + Prettier), Vitest, Playwright
4. Initialiser Drizzle ORM sur PostgreSQL
5. Créer les 6 tables canoniques avec RLS activée
6. Config Infisical pour les secrets (ou Vault)

### Phase 1 — Infrastructure Hexagram (semaine 1-2, en parallèle)

1. Provisioning des 3 VMs V1 selon le sizing dans ARCHITECTURE.md section 4
2. Docker Swarm init + overlay networks + secrets
3. Déploiement stack complète via `docker-compose.yml`
4. Tests smoke : chaque service accessible via son sous-domaine `*.timeblast.hexagram.fr`
5. Configuration backups pgBackRest + Restic + test de restore
6. Observabilité basique : Grafana accessible, dashboards Postgres/ClickHouse

### Phase 2 — Premier connecteur LeadByte (semaine 2-3)

1. Créer un tenant de test Webmedia dans la DB
2. Invoke skill `new-connector` avec `leadbyte` en argument
3. Config Nango pour LeadByte (API key)
4. Mapping vers modèle canonique dans `packages/connectors/leadbyte/mapping.ts`
5. Webhook handler pour les événements temps réel
6. Inngest job idempotent pour le traitement
7. Tests d'intégration avec fixtures réelles de LeadByte (anonymisées)
8. Vérification que les données remontent dans Cube et sont queryables

### Phase 3 — Second connecteur Dolibarr (semaine 3-4)

1. Invoke skill `new-connector` avec `dolibarr`
2. Auth API key DOLAPIKEY
3. Polling incrémental (pas de webhooks fiables)
4. Mapping ThirdParty → parties, Invoice → transactions
5. Premier agent Entity Resolution qui fait le lien lead LeadByte → facture Dolibarr
6. Test de bout en bout : un lead capturé finit par être facturé et la marge se calcule

### Phase 4 — Frontend V0 (semaine 5)

1. Next.js 15 App Router setup
2. Design tokens shadcn customisés pour Timeblast (palette, typo, animations signature)
3. Auth via Clerk self-hosted ou Auth.js + PostgreSQL
4. Layout principal : sidebar, topbar, command palette (cmd+K)
5. Première page : dashboard P&L universal branché sur Cube
6. Premier composant chart avec Tremor

### Phase 5 — Agent NLQ + UI chat (semaine 6)

1. Intégration Vercel AI SDK côté front
2. Page `/ask` avec interface conversationnelle streamée
3. Agent NLQ (déjà prototypé dans nlq-agent.ts) branché via API route
4. Premier generative UI : quand l'agent répond, un chart se génère à côté
5. Eval dataset NLQ avec 10 questions/réponses attendues Webmedia
6. Run eval automatisé dans la CI

### Phase 6 — Connecteurs Google Ads + Meta (semaine 7)

1. Google Ads : OAuth2, Developer Token (demandé en phase 0), GAQL queries pour ad spend
2. Meta Marketing API : OAuth2, App Review déjà lancée, Lead Ads webhooks
3. Mapping complet campaign → sources, spend → costs, lead → items
4. Calcul ROAS natif : `transactions.revenue / costs.ad_spend` groupé par `sources.channel`

### Phase 7 — Agent proactif + alertes (semaine 8)

1. Agent Anomaly Detector qui scanne les flows en continu via Inngest schedule
2. Détection : chute de taux de validation d'un supplier, explosion du CPL, etc.
3. Système d'alertes : notification in-app + email
4. Agent Insight Generator : briefing quotidien push par email
5. Dashboard Webmedia utilisé en interne quotidiennement

**À J+56** : Timeblast V1 opérationnel, utilisé par Webmedia, prêt à onboarder un client pilote externe.

---

## Partie 5 — Comment travailler avec ce repo

### 5.1 Le workflow standard

Pour toute feature non-triviale :

```bash
# 1. Planifier
/plan-feature <slug>
# → invoke architect → produit .claude/plans/<slug>.md
# → tu valides avant de passer à l'implémentation

# 2. Implémenter
# Demande explicitement d'utiliser l'implementer subagent
> Implémente le plan <slug> via le subagent implementer

# 3. Shipping
/ship-feature
# → séquence qa → code-review → security-review → commit → PR
# → bloque sur tout finding critical security
```

### 5.2 Règles absolues

- **Jamais de code sans plan** pour les features non-triviales (>2h)
- **Jamais de query DB sans tenantId** — c'est un bug critique
- **Jamais de merge sans security-reviewer** sur les zones sensibles (DB, agents, API)
- **Jamais éditer une migration** déjà mergée, toujours créer une nouvelle
- **Jamais de secrets hardcodés** — tout passe par Docker secrets ou Infisical
- **Chaque agent IA** a un eval dataset d'au moins 5 cas avant d'être shippé

### 5.3 Si tu doutes

- Convention non claire ? → lis `.claude/CLAUDE.md` d'abord, puis `.claude/rules/` pour les règles détaillées
- Pattern complexe à réutiliser ? → cherche dans `.claude/skills/` s'il y a un skill dédié
- Exploration nécessaire ? → utilise l'explorer subagent, ne pollue pas le main context
- Décision structurante ? → `/plan-feature` avec l'architect, ne code pas à chaud

### 5.4 Priorités immédiates à lancer en parallèle

1. **Jour 1** : demander à Hexagram le provisioning des 3 VMs V1 selon le sizing hardware
2. **Jour 1** : initier la demande d'approbation Google Ads Developer Token
3. **Jour 1** : initier l'App Review Meta pour `leads_retrieval` (2-4 semaines d'attente)
4. **Semaine 1** : pendant que les provisions tournent, monter la structure monorepo en local

---

## Partie 6 — Ce qui n'est PAS encore décidé et pourquoi

Certaines décisions ont été reportées sciemment pour ne pas pré-optimiser :

- **Choix exact de l'auth** (Clerk self-hosted vs Auth.js custom vs autre) — à décider quand on aura besoin de l'UI
- **Design system détaillé** (palette, typo, animations signature) — à faire en phase 4 avec une vraie direction artistique
- **Stratégie marketing et pricing** — hors scope technique
- **Formats et templates de briefings** de l'agent Insight Generator — à calibrer avec Webmedia une fois en usage
- **Certifications** (ISO 27001, SOC2, HDS) — à prévoir une fois qu'on a 5-10 clients payants
- **Stratégie internationale** (déploiement autres régions au-delà d'Hexagram France) — phase V3 seulement

---

## Partie 7 — Historique des décisions clés (ADR simplifié)

| Date | Décision | Contexte | Alternatives considérées |
|---|---|---|---|
| 2026-04 | Modèle canonique universel à 6 entités | Webmedia est le premier use case mais Timeblast doit servir tout business de négoce/production | Modèle CRM-centric, modèle EAV pur |
| 2026-04 | Cube.dev comme semantic layer | Éviter 6-10 mois de dev du moteur sémantique | Build from scratch, dbt Semantic Layer, Looker |
| 2026-04 | Claude via Bedrock EU (Sonnet 4.5) | Meilleur LLM agentique + résidence EU | Mistral, self-host Llama |
| 2026-04 | Stack frontend 100% custom (Next.js + shadcn) au lieu de Metabase | AGPL Metabase bloque embedding commercial, besoin d'une UX agent-first | Metabase, Superset, Hex clone |
| 2026-04 | Hébergement 100% Hexagram | Infra dispo en interne, argument souveraineté | AWS EU, Scaleway, Hetzner |
| 2026-04 | Docker Swarm au lieu de k3s | Simplicité opérationnelle pour démarrage | k3s, k8s full, nomad |
| 2026-04 | Mastra au lieu de LangGraph | Stack 100% TypeScript, plus léger | LangGraph, code custom |

---

## Partie 8 — Ressources externes utiles

- Documentation Cube.dev : https://cube.dev/docs
- Documentation Mastra : https://mastra.ai/docs
- Documentation Nango : https://docs.nango.dev
- Documentation Vercel AI SDK : https://ai-sdk.dev
- LeadByte API : https://api.leadbyte.co.uk/v2/reference
- Dolibarr API : https://wiki.dolibarr.org/index.php/Module_Web_Services_API_REST_(developer)
- Google Ads API : https://developers.google.com/google-ads/api/docs/start
- Meta Marketing API : https://developers.facebook.com/docs/marketing-apis

---

## Fin du document

**Maintenant, première action recommandée** : `/plan-feature initial-monorepo-setup` pour que l'architect produise le plan détaillé de la structure pnpm + Turborepo + packages de base. Tu valides, puis l'implementer le construit.

Si tu as des questions sur le contexte ou les décisions, relis les sections pertinentes de ce document avant de demander. Tout ce qui a été discuté est ici.
