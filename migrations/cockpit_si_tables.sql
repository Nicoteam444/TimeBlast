-- ============================================================
-- COCKPIT DE PILOTAGE SI — Tables principales
-- ============================================================

-- 1. Applications du SI
CREATE TABLE IF NOT EXISTS si_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('saas','on_premise','mobile','api','internal','other')) DEFAULT 'saas',
  vendor TEXT,
  version TEXT,
  url TEXT,
  monthly_cost NUMERIC(12,2) DEFAULT 0,
  annual_cost NUMERIC(12,2) DEFAULT 0,
  license_type TEXT,
  user_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active','deprecated','planned','decommissioned')) DEFAULT 'active',
  criticality TEXT CHECK (criticality IN ('critical','high','medium','low')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('crm','erp','hr','finance','communication','security','devops','collaboration','analytics','other')) DEFAULT 'other',
  owner TEXT,
  data_classification TEXT,
  next_renewal DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Infrastructure
CREATE TABLE IF NOT EXISTS si_infrastructure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('server','vm','container','cloud_service','network','storage','firewall','load_balancer','database','other')) DEFAULT 'server',
  provider TEXT,
  region TEXT,
  ip_address TEXT,
  os TEXT,
  specs JSONB DEFAULT '{}',
  monthly_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('running','stopped','maintenance','decommissioned')) DEFAULT 'running',
  criticality TEXT CHECK (criticality IN ('critical','high','medium','low')) DEFAULT 'medium',
  monitoring_url TEXT,
  last_health_check TIMESTAMPTZ,
  health_status TEXT CHECK (health_status IN ('healthy','warning','critical','unknown')) DEFAULT 'unknown',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Flux de donnees
CREATE TABLE IF NOT EXISTS si_data_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('application','infrastructure')) NOT NULL,
  source_id UUID NOT NULL,
  destination_type TEXT CHECK (destination_type IN ('application','infrastructure')) NOT NULL,
  destination_id UUID NOT NULL,
  protocol TEXT CHECK (protocol IN ('api_rest','api_graphql','sftp','database','webhook','manual','etl','message_queue','other')) DEFAULT 'api_rest',
  frequency TEXT CHECK (frequency IN ('realtime','hourly','daily','weekly','monthly','on_demand')) DEFAULT 'daily',
  data_type TEXT,
  volume TEXT CHECK (volume IN ('low','medium','high')) DEFAULT 'medium',
  is_encrypted BOOLEAN DEFAULT false,
  status TEXT CHECK (status IN ('active','inactive','error','planned')) DEFAULT 'active',
  last_sync TIMESTAMPTZ,
  error_rate NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Recommandations IA
CREATE TABLE IF NOT EXISTS si_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('security','optimization','cost','integration','compliance','upgrade','automation','other')) DEFAULT 'other',
  priority TEXT CHECK (priority IN ('critical','high','medium','low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending','approved','rejected','in_progress','completed','dismissed')) DEFAULT 'pending',
  impact TEXT,
  effort TEXT CHECK (effort IN ('low','medium','high')) DEFAULT 'medium',
  estimated_savings NUMERIC(12,2),
  related_entity_type TEXT,
  related_entity_id UUID,
  ai_reasoning TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Agents IA
CREATE TABLE IF NOT EXISTS si_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('monitor','transformer','validator','alerter','optimizer','connector','custom')) DEFAULT 'monitor',
  description TEXT,
  data_flow_id UUID REFERENCES si_data_flows(id) ON DELETE SET NULL,
  config JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('active','inactive','error','paused','pending_approval')) DEFAULT 'pending_approval',
  last_execution TIMESTAMPTZ,
  execution_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Scores de securite
CREATE TABLE IF NOT EXISTS si_security_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100) DEFAULT 0,
  categories JSONB DEFAULT '{}',
  vulnerabilities_count INTEGER DEFAULT 0,
  critical_issues INTEGER DEFAULT 0,
  scan_date TIMESTAMPTZ DEFAULT now(),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Journal d'audit SI
CREATE TABLE IF NOT EXISTS si_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  societe_id UUID REFERENCES societes(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_si_applications_societe ON si_applications(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_applications_status ON si_applications(status);
CREATE INDEX IF NOT EXISTS idx_si_infrastructure_societe ON si_infrastructure(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_infrastructure_status ON si_infrastructure(status);
CREATE INDEX IF NOT EXISTS idx_si_data_flows_societe ON si_data_flows(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_data_flows_status ON si_data_flows(status);
CREATE INDEX IF NOT EXISTS idx_si_recommendations_societe ON si_recommendations(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_recommendations_status ON si_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_si_recommendations_priority ON si_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_si_agents_societe ON si_agents(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_agents_status ON si_agents(status);
CREATE INDEX IF NOT EXISTS idx_si_security_scores_societe ON si_security_scores(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_audit_log_societe ON si_audit_log(societe_id);
CREATE INDEX IF NOT EXISTS idx_si_audit_log_created ON si_audit_log(created_at DESC);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE si_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_infrastructure ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_data_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_security_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE si_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for all SI tables (matching existing pattern)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['si_applications','si_infrastructure','si_data_flows','si_recommendations','si_agents','si_security_scores','si_audit_log']
  LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (true)', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (true)', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (true)', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (true)', t || '_delete', t);
  END LOOP;
END $$;

-- ============================================================
-- DONNEES DE DEMO
-- ============================================================

-- Note: Les UUIDs sont fixes pour pouvoir referencer les flux
-- Utiliser avec une societe_id existante

-- Helper: on utilise une variable pour la societe de demo
-- A executer apres avoir identifie la societe_id cible

-- Applications de demo
INSERT INTO si_applications (id, societe_id, name, type, vendor, version, url, monthly_cost, annual_cost, license_type, user_count, status, criticality, category, owner, next_renewal) VALUES
  ('a0000001-0000-0000-0000-000000000001', (SELECT id FROM societes LIMIT 1), 'Microsoft 365', 'saas', 'Microsoft', 'E3', 'https://portal.office.com', 1250, 15000, 'Abonnement', 45, 'active', 'critical', 'collaboration', 'DSI', '2027-01-01'),
  ('a0000001-0000-0000-0000-000000000002', (SELECT id FROM societes LIMIT 1), 'Sage 100 Compta', 'on_premise', 'Sage', 'v10.0', NULL, 320, 3840, 'Licence perpetuelle + maintenance', 5, 'active', 'critical', 'finance', 'DAF', '2026-12-31'),
  ('a0000001-0000-0000-0000-000000000003', (SELECT id FROM societes LIMIT 1), 'Salesforce CRM', 'saas', 'Salesforce', 'Enterprise', 'https://login.salesforce.com', 2100, 25200, 'Abonnement', 15, 'active', 'high', 'crm', 'Dir. Commercial', '2026-09-15'),
  ('a0000001-0000-0000-0000-000000000004', (SELECT id FROM societes LIMIT 1), 'Slack', 'saas', 'Salesforce', 'Business+', 'https://app.slack.com', 580, 6960, 'Abonnement', 45, 'active', 'high', 'communication', 'DSI', '2026-11-01'),
  ('a0000001-0000-0000-0000-000000000005', (SELECT id FROM societes LIMIT 1), 'GitLab', 'saas', 'GitLab', 'Premium', 'https://gitlab.com', 450, 5400, 'Abonnement', 12, 'active', 'critical', 'devops', 'CTO', '2027-03-01'),
  ('a0000001-0000-0000-0000-000000000006', (SELECT id FROM societes LIMIT 1), 'PayFit', 'saas', 'PayFit', 'Standard', 'https://app.payfit.com', 380, 4560, 'Abonnement', 3, 'active', 'high', 'hr', 'DRH', '2026-08-01'),
  ('a0000001-0000-0000-0000-000000000007', (SELECT id FROM societes LIMIT 1), 'Notion', 'saas', 'Notion Labs', 'Team', 'https://notion.so', 120, 1440, 'Abonnement', 30, 'active', 'medium', 'collaboration', 'DSI', '2026-10-01'),
  ('a0000001-0000-0000-0000-000000000008', (SELECT id FROM societes LIMIT 1), 'HubSpot Marketing', 'saas', 'HubSpot', 'Pro', 'https://app.hubspot.com', 740, 8880, 'Abonnement', 8, 'active', 'medium', 'analytics', 'Dir. Marketing', '2027-02-01'),
  ('a0000001-0000-0000-0000-000000000009', (SELECT id FROM societes LIMIT 1), 'Qonto', 'saas', 'Qonto', 'Business', 'https://app.qonto.com', 90, 1080, 'Abonnement', 4, 'active', 'high', 'finance', 'DAF', '2026-12-01'),
  ('a0000001-0000-0000-0000-000000000010', (SELECT id FROM societes LIMIT 1), 'Ancien ERP Interne', 'on_premise', 'Dev interne', 'v3.2', NULL, 0, 0, 'Interne', 5, 'deprecated', 'low', 'erp', 'DSI', NULL)
ON CONFLICT (id) DO NOTHING;

-- Infrastructure de demo
INSERT INTO si_infrastructure (id, societe_id, name, type, provider, region, ip_address, os, specs, monthly_cost, status, criticality, health_status) VALUES
  ('b0000001-0000-0000-0000-000000000001', (SELECT id FROM societes LIMIT 1), 'Azure AD Tenant', 'cloud_service', 'Microsoft Azure', 'West Europe', NULL, NULL, '{"service": "Azure Active Directory", "plan": "P1"}', 280, 'running', 'critical', 'healthy'),
  ('b0000001-0000-0000-0000-000000000002', (SELECT id FROM societes LIMIT 1), 'Serveur Fichiers OVH', 'server', 'OVH', 'Gravelines (FR)', '51.210.xx.xx', 'Ubuntu 22.04 LTS', '{"cpu": "4 vCPU", "ram": "16 GB", "storage": "500 GB SSD"}', 65, 'running', 'high', 'healthy'),
  ('b0000001-0000-0000-0000-000000000003', (SELECT id FROM societes LIMIT 1), 'NAS Synology Bureau', 'storage', 'Synology', 'On-premise Paris', '192.168.1.50', 'DSM 7.2', '{"model": "DS920+", "storage": "8 TB RAID5"}', 0, 'running', 'medium', 'warning'),
  ('b0000001-0000-0000-0000-000000000004', (SELECT id FROM societes LIMIT 1), 'PostgreSQL Supabase', 'database', 'Supabase', 'EU West', NULL, 'PostgreSQL 15', '{"plan": "Pro", "storage": "8 GB", "connections": 200}', 25, 'running', 'critical', 'healthy'),
  ('b0000001-0000-0000-0000-000000000005', (SELECT id FROM societes LIMIT 1), 'Firewall Fortinet', 'firewall', 'Fortinet', 'On-premise Paris', '192.168.1.1', 'FortiOS 7.4', '{"model": "FortiGate 60F", "throughput": "10 Gbps"}', 45, 'running', 'critical', 'healthy')
ON CONFLICT (id) DO NOTHING;

-- Flux de donnees de demo
INSERT INTO si_data_flows (id, societe_id, name, source_type, source_id, destination_type, destination_id, protocol, frequency, data_type, volume, is_encrypted, status) VALUES
  ('c0000001-0000-0000-0000-000000000001', (SELECT id FROM societes LIMIT 1), 'Sync contacts Salesforce → HubSpot', 'application', 'a0000001-0000-0000-0000-000000000003', 'application', 'a0000001-0000-0000-0000-000000000008', 'api_rest', 'hourly', 'Contacts & Leads', 'medium', true, 'active'),
  ('c0000001-0000-0000-0000-000000000002', (SELECT id FROM societes LIMIT 1), 'Export compta Sage → Qonto', 'application', 'a0000001-0000-0000-0000-000000000002', 'application', 'a0000001-0000-0000-0000-000000000009', 'sftp', 'daily', 'Ecritures comptables', 'low', false, 'active'),
  ('c0000001-0000-0000-0000-000000000003', (SELECT id FROM societes LIMIT 1), 'Auth Azure AD → M365', 'infrastructure', 'b0000001-0000-0000-0000-000000000001', 'application', 'a0000001-0000-0000-0000-000000000001', 'api_rest', 'realtime', 'Authentification SSO', 'high', true, 'active'),
  ('c0000001-0000-0000-0000-000000000004', (SELECT id FROM societes LIMIT 1), 'Backup fichiers → NAS', 'infrastructure', 'b0000001-0000-0000-0000-000000000002', 'infrastructure', 'b0000001-0000-0000-0000-000000000003', 'sftp', 'daily', 'Fichiers sauvegarde', 'high', false, 'active'),
  ('c0000001-0000-0000-0000-000000000005', (SELECT id FROM societes LIMIT 1), 'Bulletins PayFit → Sage', 'application', 'a0000001-0000-0000-0000-000000000006', 'application', 'a0000001-0000-0000-0000-000000000002', 'api_rest', 'monthly', 'OD de paie', 'low', true, 'active'),
  ('c0000001-0000-0000-0000-000000000006', (SELECT id FROM societes LIMIT 1), 'Notifications Slack ← GitLab', 'application', 'a0000001-0000-0000-0000-000000000005', 'application', 'a0000001-0000-0000-0000-000000000004', 'webhook', 'realtime', 'CI/CD Events', 'medium', true, 'active'),
  ('c0000001-0000-0000-0000-000000000007', (SELECT id FROM societes LIMIT 1), 'Pipeline ancien ERP → Sage', 'application', 'a0000001-0000-0000-0000-000000000010', 'application', 'a0000001-0000-0000-0000-000000000002', 'database', 'daily', 'Donnees legacy', 'low', false, 'error'),
  ('c0000001-0000-0000-0000-000000000008', (SELECT id FROM societes LIMIT 1), 'Logs applicatifs → Supabase', 'application', 'a0000001-0000-0000-0000-000000000005', 'infrastructure', 'b0000001-0000-0000-0000-000000000004', 'api_rest', 'realtime', 'Logs & Metriques', 'high', true, 'active')
ON CONFLICT (id) DO NOTHING;

-- Recommandations IA de demo
INSERT INTO si_recommendations (societe_id, title, description, category, priority, status, impact, effort, estimated_savings, ai_reasoning) VALUES
  ((SELECT id FROM societes LIMIT 1), 'Chiffrer le flux Sage → Qonto', 'Le flux d''export comptable entre Sage et Qonto transite en SFTP sans chiffrement TLS. Les ecritures comptables contiennent des donnees financieres sensibles.', 'security', 'critical', 'pending', 'Protege les donnees financieres contre l''interception', 'low', NULL, 'Analyse automatique : flux SFTP non chiffre detecte sur donnees classifiees "financier". Risque RGPD et securite eleve.'),
  ((SELECT id FROM societes LIMIT 1), 'Decommissionner l''ancien ERP interne', 'L''ancien ERP (v3.2) est en statut "deprecated" mais un flux quotidien vers Sage est en erreur. Migrer les donnees residuelles et couper le flux.', 'optimization', 'high', 'pending', 'Supprime un point de defaillance et simplifie l''architecture', 'medium', 320, 'Application deprecated avec flux en erreur detecte. Cout de maintenance implicite estime a 320 EUR/mois.'),
  ((SELECT id FROM societes LIMIT 1), 'Activer le MFA sur Azure AD', 'Seul le SSO est active. L''authentification multi-facteur (MFA) n''est pas imposee pour les comptes administrateurs.', 'security', 'high', 'pending', 'Reduit de 99% le risque de compromission de compte admin', 'low', NULL, 'Analyse posture securite : Azure AD P1 actif sans politique MFA detectee. Best practice ANSSI non respectee.'),
  ((SELECT id FROM societes LIMIT 1), 'Mettre en place un backup off-site', 'Les sauvegardes transitent du serveur OVH vers le NAS on-premise. Aucune copie off-site n''est detectee. Risque en cas de sinistre.', 'security', 'medium', 'pending', 'Plan de reprise d''activite (PRA) conforme', 'medium', NULL, 'Flux backup detecte uniquement vers stockage local. Aucun flux vers cloud storage ou site distant.'),
  ((SELECT id FROM societes LIMIT 1), 'Consolider les licences Salesforce', '15 licences Enterprise actives mais seulement 9 utilisateurs connectes ce mois. Passer a 10 licences permettrait une economie significative.', 'cost', 'medium', 'pending', 'Reduction du cout CRM de 33%', 'low', 700, 'Analyse usage : 9/15 licences utilisees sur les 30 derniers jours. Economie estimee : 5 x 140 EUR = 700 EUR/mois.')
ON CONFLICT DO NOTHING;

-- Score de securite initial
INSERT INTO si_security_scores (societe_id, overall_score, categories, vulnerabilities_count, critical_issues, details) VALUES
  ((SELECT id FROM societes LIMIT 1), 62, '{"authentification": 70, "chiffrement": 45, "sauvegarde": 40, "mises_a_jour": 80, "acces_reseau": 75, "conformite": 55}', 8, 2, '{"last_scan": "2026-04-10", "scanner": "TimeBlast SI Analyzer", "recommendations_count": 5}')
ON CONFLICT DO NOTHING;

-- Agents IA de demo
INSERT INTO si_agents (societe_id, name, type, description, data_flow_id, config, status, execution_count) VALUES
  ((SELECT id FROM societes LIMIT 1), 'Moniteur flux Salesforce-HubSpot', 'monitor', 'Surveille la synchronisation des contacts et alerte en cas d''ecart > 5%', 'c0000001-0000-0000-0000-000000000001', '{"threshold_percent": 5, "check_interval": "1h", "alert_channel": "slack"}', 'active', 342),
  ((SELECT id FROM societes LIMIT 1), 'Validateur ecritures comptables', 'validator', 'Verifie la coherence des OD de paie avant import dans Sage', 'c0000001-0000-0000-0000-000000000005', '{"rules": ["debit_credit_balance", "account_exists", "period_match"], "auto_reject": false}', 'active', 24)
ON CONFLICT DO NOTHING;

-- Audit log de demo
INSERT INTO si_audit_log (societe_id, user_name, action, entity_type, entity_name, details) VALUES
  ((SELECT id FROM societes LIMIT 1), 'Nicolas N.', 'Agent deploye', 'agent', 'Moniteur flux Salesforce-HubSpot', '{"type": "monitor", "flow": "Sync contacts Salesforce → HubSpot"}'),
  ((SELECT id FROM societes LIMIT 1), 'IA TimeBlast', 'Recommandation generee', 'recommendation', 'Chiffrer le flux Sage → Qonto', '{"category": "security", "priority": "critical"}'),
  ((SELECT id FROM societes LIMIT 1), 'Nicolas N.', 'Application ajoutee', 'application', 'HubSpot Marketing', '{"category": "analytics", "cost": 740}'),
  ((SELECT id FROM societes LIMIT 1), 'IA TimeBlast', 'Scan securite effectue', 'security', 'Score global: 62/100', '{"score": 62, "vulnerabilities": 8}'),
  ((SELECT id FROM societes LIMIT 1), 'Marie D.', 'Flux modifie', 'data_flow', 'Notifications Slack ← GitLab', '{"change": "webhook_url_updated"}')
ON CONFLICT DO NOTHING;
