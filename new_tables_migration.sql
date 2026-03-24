-- ═══════════════════════════════════════════════════════════════════
-- TIMEBLAST — Nouvelles tables pour E-Facture et Bookmarks
-- Exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. USER FAVORITES (Marque-pages persistants)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_path text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, route_path)
);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_favorites_own" ON user_favorites;
CREATE POLICY "user_favorites_own" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created ON user_favorites(created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 2. E-INVOICE DISTRIBUTION (Distribution des factures)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id) ON DELETE CASCADE,
  facture_id uuid REFERENCES factures(id) ON DELETE CASCADE,
  distribution_method text NOT NULL, -- 'email', 'chorus_pro', 'xml_export', 'api_direct'
  recipient_email text,
  recipient_siret text,
  distribution_date timestamptz,
  status text DEFAULT 'pending', -- pending, sent, received, failed
  error_message text,
  metadata jsonb DEFAULT '{}' -- Pour stocker des infos supplémentaires
);

ALTER TABLE invoice_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_distributions_all" ON invoice_distributions;
CREATE POLICY "invoice_distributions_all" ON invoice_distributions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM societes WHERE id = invoice_distributions.societe_id
    AND id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_invoice_distributions_facture ON invoice_distributions(facture_id);
CREATE INDEX IF NOT EXISTS idx_invoice_distributions_societe ON invoice_distributions(societe_id);
CREATE INDEX IF NOT EXISTS idx_invoice_distributions_status ON invoice_distributions(status);

-- ─────────────────────────────────────────────────────────────────
-- 3. INVOICE STATUS HISTORY (Historique des statuts)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  old_status text,
  new_status text,
  changed_by uuid REFERENCES profiles(id),
  metadata jsonb DEFAULT '{}' -- sent_date, received_date, opened_date, paid_date
);

ALTER TABLE invoice_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_status_history_all" ON invoice_status_history;
CREATE POLICY "invoice_status_history_all" ON invoice_status_history
  FOR ALL USING (EXISTS (
    SELECT 1 FROM factures
    WHERE id = invoice_status_history.facture_id
    AND societe_id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_invoice_status_history_facture ON invoice_status_history(facture_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status_history_created ON invoice_status_history(created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 4. CLIENT PORTAL USERS (Accès des clients)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id) ON DELETE CASCADE,
  email text NOT NULL,
  company_name text,
  company_siret text,
  last_login timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(societe_id, email)
);

ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;

-- Les clients ne peuvent voir que leurs propres données
DROP POLICY IF EXISTS "client_portal_users_own" ON client_portal_users;
CREATE POLICY "client_portal_users_own" ON client_portal_users
  FOR ALL USING (
    email = current_user_email()
    OR EXISTS (SELECT 1 FROM societes WHERE id = societe_id
              AND id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_client_portal_users_societe ON client_portal_users(societe_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_email ON client_portal_users(email);

-- ─────────────────────────────────────────────────────────────────
-- 5. INVOICE ACCESS TOKENS (Tokens d'accès pour les clients)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoice_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  client_id uuid REFERENCES client_portal_users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz DEFAULT (now() + interval '90 days'),
  accessed_at timestamptz,
  access_count integer DEFAULT 0,
  is_active boolean DEFAULT true
);

ALTER TABLE invoice_access_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens peuvent être accédés sans authentification (pour partage public)
-- Mais la modification est restreinte
DROP POLICY IF EXISTS "invoice_access_tokens_select" ON invoice_access_tokens;
CREATE POLICY "invoice_access_tokens_select" ON invoice_access_tokens
  FOR SELECT USING (true); -- Accessible au public pour vérification

DROP POLICY IF EXISTS "invoice_access_tokens_modify" ON invoice_access_tokens;
CREATE POLICY "invoice_access_tokens_modify" ON invoice_access_tokens
  FOR ALL USING (EXISTS (
    SELECT 1 FROM factures
    WHERE id = invoice_access_tokens.facture_id
    AND societe_id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_invoice_access_tokens_facture ON invoice_access_tokens(facture_id);
CREATE INDEX IF NOT EXISTS idx_invoice_access_tokens_client ON invoice_access_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_access_tokens_token ON invoice_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invoice_access_tokens_expires ON invoice_access_tokens(expires_at);

-- ─────────────────────────────────────────────────────────────────
-- 6. EXTEND FACTURES TABLE avec colonnes E-Facture
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE factures ADD COLUMN IF NOT EXISTS distribution_status text DEFAULT 'draft'; -- draft, sent, received, opened, paid
ALTER TABLE factures ADD COLUMN IF NOT EXISTS distribution_date timestamptz;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS received_date timestamptz;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS opened_date timestamptz;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS paid_date timestamptz;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS xml_ubl text; -- Stocke le XML UBL généré
ALTER TABLE factures ADD COLUMN IF NOT EXISTS xml_facture_x text; -- Stocke le XML Facture-X (UBL + PDF)
ALTER TABLE factures ADD COLUMN IF NOT EXISTS chorus_pro_id text; -- ID Chorus Pro si transmis
ALTER TABLE factures ADD COLUMN IF NOT EXISTS client_email text; -- Email du destinataire (peut différer du client)

-- ─────────────────────────────────────────────────────────────────
-- 7. DISTRIBUTION LOG (Audit trail détaillé)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS distribution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  facture_id uuid NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'sent', 'received', 'opened', 'bounced', 'failed'
  action_by uuid REFERENCES profiles(id),
  recipient_email text,
  method text, -- 'email', 'chorus_pro', etc.
  status_code integer,
  error_details text,
  metadata jsonb DEFAULT '{}'
);

ALTER TABLE distribution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "distribution_logs_all" ON distribution_logs;
CREATE POLICY "distribution_logs_all" ON distribution_logs
  FOR ALL USING (EXISTS (
    SELECT 1 FROM factures
    WHERE id = distribution_logs.facture_id
    AND societe_id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_distribution_logs_facture ON distribution_logs(facture_id);
CREATE INDEX IF NOT EXISTS idx_distribution_logs_action ON distribution_logs(action);
CREATE INDEX IF NOT EXISTS idx_distribution_logs_created ON distribution_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────────
-- 8. ACCOUNTING SOFTWARE CREDENTIALS (Pour intégrations)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS accounting_software_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  societe_id uuid NOT NULL REFERENCES societes(id) ON DELETE CASCADE,
  software_type text NOT NULL, -- 'sage', 'cegid', 'quickbooks', 'pennylane'
  api_key text NOT NULL ENCRYPTED,
  api_secret text ENCRYPTED,
  configuration jsonb DEFAULT '{}', -- Configuration spécifique au logiciel
  last_sync timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE accounting_software_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounting_software_credentials_all" ON accounting_software_credentials;
CREATE POLICY "accounting_software_credentials_all" ON accounting_software_credentials
  FOR ALL USING (EXISTS (
    SELECT 1 FROM societes
    WHERE id = accounting_software_credentials.societe_id
    AND id IN (SELECT societe_id FROM user_societes WHERE user_id = auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_accounting_software_credentials_societe ON accounting_software_credentials(societe_id);

-- Done! Tables créées et sécurisées avec RLS
