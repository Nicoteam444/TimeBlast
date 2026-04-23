-- ============================================================
-- WEBMEDIA — Plateforme de gestion de leads
-- A executer dans le NOUVEAU projet Supabase Webmedia
-- ============================================================

-- 1. Campagnes d'acquisition
CREATE TABLE IF NOT EXISTS wm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('meta_ads','google_ads','sms','jeux_concours','lemlist','linkedin','autres')) NOT NULL,
  thematic TEXT,
  status TEXT CHECK (status IN ('active','paused','ended','draft')) DEFAULT 'active',
  budget NUMERIC(12,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  starts_on DATE,
  ends_on DATE,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Leads
CREATE TABLE IF NOT EXISTS wm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES wm_campaigns(id) ON DELETE SET NULL,
  source TEXT,
  thematic TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  zip TEXT,
  city TEXT,
  status TEXT CHECK (status IN ('generated','purchased','sold','dead')) DEFAULT 'generated',
  acquisition_cost NUMERIC(10,2) DEFAULT 0,
  sale_price NUMERIC(10,2),
  quality_score INTEGER CHECK (quality_score BETWEEN 0 AND 100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Clients acheteurs
CREATE TABLE IF NOT EXISTS wm_buyer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  thematics TEXT[] DEFAULT '{}',
  monthly_volume INTEGER DEFAULT 0,
  unit_price NUMERIC(10,2),
  hourly_rate NUMERIC(10,2) DEFAULT 100,
  billing_mode TEXT CHECK (billing_mode IN ('per_lead','per_hour','per_batch','mixed')) DEFAULT 'per_lead',
  status TEXT CHECK (status IN ('active','paused','ended','prospect')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Ventes de leads
CREATE TABLE IF NOT EXISTS wm_lead_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES wm_leads(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES wm_buyer_clients(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL,
  sold_at TIMESTAMPTZ DEFAULT now(),
  invoice_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Achats de leads externes
CREATE TABLE IF NOT EXISTS wm_lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES wm_leads(id) ON DELETE SET NULL,
  source_provider TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  thematic TEXT,
  volume INTEGER DEFAULT 1,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Factures
CREATE TABLE IF NOT EXISTS wm_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES wm_buyer_clients(id) ON DELETE SET NULL,
  number TEXT UNIQUE NOT NULL,
  lines JSONB NOT NULL DEFAULT '[]',
  amount_ht NUMERIC(12,2) NOT NULL,
  amount_ttc NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 20,
  status TEXT CHECK (status IN ('draft','sent','paid','overdue','cancelled')) DEFAULT 'draft',
  issued_on DATE DEFAULT CURRENT_DATE,
  due_on DATE,
  paid_on DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_wm_campaigns_channel ON wm_campaigns(channel);
CREATE INDEX IF NOT EXISTS idx_wm_campaigns_status ON wm_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_wm_campaigns_thematic ON wm_campaigns(thematic);
CREATE INDEX IF NOT EXISTS idx_wm_leads_campaign ON wm_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wm_leads_status ON wm_leads(status);
CREATE INDEX IF NOT EXISTS idx_wm_leads_thematic ON wm_leads(thematic);
CREATE INDEX IF NOT EXISTS idx_wm_leads_created ON wm_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wm_buyers_status ON wm_buyer_clients(status);
CREATE INDEX IF NOT EXISTS idx_wm_sales_buyer ON wm_lead_sales(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wm_sales_lead ON wm_lead_sales(lead_id);
CREATE INDEX IF NOT EXISTS idx_wm_sales_sold_at ON wm_lead_sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_wm_purchases_provider ON wm_lead_purchases(source_provider);
CREATE INDEX IF NOT EXISTS idx_wm_invoices_buyer ON wm_invoices(buyer_id);
CREATE INDEX IF NOT EXISTS idx_wm_invoices_status ON wm_invoices(status);

-- ============================================================
-- RLS — single-tenant, tout accessible par les utilisateurs authentifies
-- ============================================================
ALTER TABLE wm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wm_buyer_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE wm_lead_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE wm_lead_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wm_invoices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['wm_campaigns','wm_leads','wm_buyer_clients','wm_lead_sales','wm_lead_purchases','wm_invoices']
  LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (true)', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (true)', t || '_insert', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (true)', t || '_update', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (true)', t || '_delete', t);
  END LOOP;
END $$;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Top 10 acheteurs (d'apres le pptx kick-off T1 2026)
INSERT INTO wm_buyer_clients (id, name, contact_name, email, thematics, monthly_volume, unit_price, billing_mode, status) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'MONDIAL BIS LTD', 'M. Directeur', 'contact@mondialbis.com', ARRAY['Investissement'], 800, 140, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000002', 'DEVIS PLUS', 'M. Dupont', 'contact@devisplus.fr', ARRAY['Travaux','Banque/Assurance'], 600, 155, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000003', 'MYE FORMATION', 'Mme Martin', 'contact@myeformation.fr', ARRAY['Formation'], 450, 162, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000004', 'GS SERVICE SRL', 'M. Rossi', 'contact@gsservice.it', ARRAY['Investissement'], 350, 140, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000005', 'SAINT ETIENNE METROPOLE', 'Service Marche', 'marches@saint-etienne-metropole.fr', ARRAY['B2B'], 200, 173, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000006', 'BETOWIN UNIPESSOAL LDA', 'M. Silva', 'contact@betowin.pt', ARRAY['Investissement'], 220, 150, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000007', 'ICI FORMATIONS', 'Mme Lefevre', 'contact@iciformations.fr', ARRAY['Formation'], 200, 157, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000008', 'INTERNOVUS', 'M. Novus', 'contact@internovus.com', ARRAY['Investissement'], 200, 150, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000009', 'COMPARADISE SAS', 'M. Dubois', 'contact@comparadise.fr', ARRAY['Banque/Assurance'], 200, 148, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000010', 'LOTUSCALE SL', 'M. Garcia', 'contact@lotuscale.es', ARRAY['Investissement'], 190, 152, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000011', 'MONDIAL TELECOM', 'M. Telecom', 'contact@mondialtelecom.fr', ARRAY['Investissement'], 400, 145, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000012', 'PILOTIN', 'M. Pilotin', 'contact@pilotin.fr', ARRAY['B2B','Formation'], 100, 120, 'mixed', 'active'),
  ('b0000001-0000-0000-0000-000000000013', 'AEG PATRIMOINE', 'M. Patrimoine', 'contact@aegpatrimoine.fr', ARRAY['Banque/Assurance'], 150, 135, 'per_lead', 'active'),
  ('b0000001-0000-0000-0000-000000000014', 'HAELYOS', 'M. Haelyos', 'contact@haelyos.com', ARRAY['B2B'], 80, 180, 'per_hour', 'prospect')
ON CONFLICT (id) DO NOTHING;

-- Campagnes demo (5 par levier)
INSERT INTO wm_campaigns (id, name, channel, thematic, status, budget, cost, starts_on, ends_on) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Meta - Credit Conso T1', 'meta_ads', 'Banque/Assurance', 'active', 15000, 12400, '2026-01-01', '2026-03-31'),
  ('c0000001-0000-0000-0000-000000000002', 'Meta - Assurance Vie', 'meta_ads', 'Banque/Assurance', 'active', 12000, 9850, '2026-02-01', '2026-04-30'),
  ('c0000001-0000-0000-0000-000000000003', 'Meta - Travaux Renovation', 'meta_ads', 'Travaux', 'active', 18000, 16200, '2026-01-15', '2026-04-15'),
  ('c0000001-0000-0000-0000-000000000004', 'Meta - Silver Economy', 'meta_ads', 'Silver', 'paused', 8000, 5400, '2026-02-15', '2026-05-15'),
  ('c0000001-0000-0000-0000-000000000005', 'Meta - Formation Pro', 'meta_ads', 'Formation', 'active', 10000, 7800, '2026-03-01', '2026-05-31'),
  ('c0000001-0000-0000-0000-000000000006', 'Google - Livret A', 'google_ads', 'Banque/Assurance', 'active', 20000, 18500, '2026-01-01', '2026-03-31'),
  ('c0000001-0000-0000-0000-000000000007', 'Google - Credit Immobilier', 'google_ads', 'Investissement', 'active', 25000, 22100, '2026-01-01', '2026-03-31'),
  ('c0000001-0000-0000-0000-000000000008', 'Google - Dommage Ouvrage', 'google_ads', 'Travaux', 'active', 8000, 6900, '2026-02-01', '2026-04-30'),
  ('c0000001-0000-0000-0000-000000000009', 'Google - Prevoyance', 'google_ads', 'Banque/Assurance', 'active', 10000, 8400, '2026-02-15', '2026-05-15'),
  ('c0000001-0000-0000-0000-000000000010', 'Google - Mutuelle Senior', 'google_ads', 'Silver', 'ended', 12000, 11800, '2026-01-01', '2026-02-28'),
  ('c0000001-0000-0000-0000-000000000011', 'SMS - Investissement Q1', 'sms', 'Investissement', 'active', 6000, 5100, '2026-01-15', '2026-03-15'),
  ('c0000001-0000-0000-0000-000000000012', 'SMS - Travaux Q1', 'sms', 'Travaux', 'active', 4500, 3900, '2026-01-15', '2026-03-15'),
  ('c0000001-0000-0000-0000-000000000013', 'SMS - Assurance Q1', 'sms', 'Banque/Assurance', 'ended', 5000, 4800, '2026-01-01', '2026-02-28'),
  ('c0000001-0000-0000-0000-000000000014', 'SMS - Formation Q1', 'sms', 'Formation', 'paused', 3000, 1900, '2026-02-01', '2026-04-30'),
  ('c0000001-0000-0000-0000-000000000015', 'SMS - Silver Q1', 'sms', 'Silver', 'active', 3500, 2400, '2026-02-15', '2026-04-15'),
  ('c0000001-0000-0000-0000-000000000016', 'Jeux - Vacances 2026', 'jeux_concours', 'E-commerce', 'ended', 5000, 4850, '2026-01-01', '2026-02-15'),
  ('c0000001-0000-0000-0000-000000000017', 'Jeux - Noel 2025', 'jeux_concours', 'E-commerce', 'ended', 7000, 6900, '2025-11-01', '2025-12-31'),
  ('c0000001-0000-0000-0000-000000000018', 'Jeux - Tirage Pro', 'jeux_concours', 'B2B', 'active', 4000, 2100, '2026-03-01', '2026-05-31'),
  ('c0000001-0000-0000-0000-000000000019', 'Jeux - Senior Gagne', 'jeux_concours', 'Silver', 'draft', 3000, 0, '2026-04-01', '2026-06-30'),
  ('c0000001-0000-0000-0000-000000000020', 'Jeux - Travaux Concours', 'jeux_concours', 'Travaux', 'active', 4500, 3200, '2026-02-01', '2026-04-30'),
  ('c0000001-0000-0000-0000-000000000021', 'Lemlist - B2B Outbound', 'lemlist', 'B2B', 'active', 2000, 1200, '2026-03-01', '2026-05-31'),
  ('c0000001-0000-0000-0000-000000000022', 'LinkedIn - Brand Awareness', 'linkedin', 'B2B', 'active', 3000, 2100, '2026-01-01', '2026-06-30'),
  ('c0000001-0000-0000-0000-000000000023', 'LinkedIn - Lead Gen Direct', 'linkedin', 'B2B', 'active', 5000, 4200, '2026-02-01', '2026-04-30'),
  ('c0000001-0000-0000-0000-000000000024', 'Autres - Affiliation', 'autres', 'Banque/Assurance', 'active', 6000, 4900, '2026-01-01', '2026-03-31'),
  ('c0000001-0000-0000-0000-000000000025', 'Autres - Co-registration', 'autres', 'Silver', 'active', 3500, 2800, '2026-02-01', '2026-04-30')
ON CONFLICT (id) DO NOTHING;

-- Leads demo (generation programmatique via anonymisation)
INSERT INTO wm_leads (campaign_id, source, thematic, first_name, last_name, email, phone, zip, status, acquisition_cost, sale_price, quality_score) VALUES
  -- Leads vendus (50)
  ('c0000001-0000-0000-0000-000000000001', 'facebook', 'Banque/Assurance', 'Jean', 'Dupont', 'j.dupont@example.fr', '0612345001', '75001', 'sold', 18.50, 140.00, 85),
  ('c0000001-0000-0000-0000-000000000001', 'facebook', 'Banque/Assurance', 'Marie', 'Martin', 'm.martin@example.fr', '0612345002', '69001', 'sold', 18.50, 140.00, 78),
  ('c0000001-0000-0000-0000-000000000002', 'facebook', 'Banque/Assurance', 'Pierre', 'Durand', 'p.durand@example.fr', '0612345003', '13001', 'sold', 22.00, 148.00, 82),
  ('c0000001-0000-0000-0000-000000000003', 'facebook', 'Travaux', 'Sophie', 'Lefebvre', 's.lefebvre@example.fr', '0612345004', '31001', 'sold', 25.00, 155.00, 90),
  ('c0000001-0000-0000-0000-000000000003', 'facebook', 'Travaux', 'Luc', 'Moreau', 'l.moreau@example.fr', '0612345005', '44001', 'sold', 25.00, 155.00, 88),
  ('c0000001-0000-0000-0000-000000000006', 'google', 'Banque/Assurance', 'Claire', 'Bernard', 'c.bernard@example.fr', '0612345006', '33001', 'sold', 28.00, 148.00, 75),
  ('c0000001-0000-0000-0000-000000000007', 'google', 'Investissement', 'Thomas', 'Girard', 't.girard@example.fr', '0612345007', '59001', 'sold', 32.00, 140.00, 80),
  ('c0000001-0000-0000-0000-000000000007', 'google', 'Investissement', 'Isabelle', 'Roux', 'i.roux@example.fr', '0612345008', '67001', 'sold', 32.00, 140.00, 85),
  ('c0000001-0000-0000-0000-000000000008', 'google', 'Travaux', 'Nicolas', 'Blanc', 'n.blanc@example.fr', '0612345009', '35001', 'sold', 38.00, 155.00, 92),
  ('c0000001-0000-0000-0000-000000000011', 'sms', 'Investissement', 'Emma', 'Guerin', 'e.guerin@example.fr', '0612345010', '75002', 'sold', 8.50, 140.00, 70),
  ('c0000001-0000-0000-0000-000000000011', 'sms', 'Investissement', 'Hugo', 'Faure', 'h.faure@example.fr', '0612345011', '69002', 'sold', 8.50, 140.00, 72),
  ('c0000001-0000-0000-0000-000000000012', 'sms', 'Travaux', 'Laura', 'Gauthier', 'l.gauthier@example.fr', '0612345012', '13002', 'sold', 9.00, 155.00, 78),
  ('c0000001-0000-0000-0000-000000000013', 'sms', 'Banque/Assurance', 'Julien', 'Rolland', 'j.rolland@example.fr', '0612345013', '31002', 'sold', 10.00, 148.00, 75),
  ('c0000001-0000-0000-0000-000000000021', 'lemlist', 'B2B', 'Aline', 'Perrot', 'a.perrot@startup.fr', '0612345014', '75003', 'sold', 15.00, 173.00, 88),
  ('c0000001-0000-0000-0000-000000000023', 'linkedin', 'B2B', 'Marc', 'Vidal', 'm.vidal@entreprise.fr', '0612345015', '69003', 'sold', 20.00, 173.00, 92),
  -- Leads generated (50)
  ('c0000001-0000-0000-0000-000000000001', 'facebook', 'Banque/Assurance', 'Anne', 'Chevalier', 'a.chevalier@example.fr', '0612345016', '13003', 'generated', 18.50, NULL, 70),
  ('c0000001-0000-0000-0000-000000000002', 'facebook', 'Banque/Assurance', 'Paul', 'Meyer', 'p.meyer@example.fr', '0612345017', '31003', 'generated', 22.00, NULL, 65),
  ('c0000001-0000-0000-0000-000000000004', 'facebook', 'Silver', 'Jeanne', 'Colin', 'j.colin@example.fr', '0612345018', '75004', 'generated', 20.00, NULL, 60),
  ('c0000001-0000-0000-0000-000000000005', 'facebook', 'Formation', 'Olivier', 'Perez', 'o.perez@example.fr', '0612345019', '69004', 'generated', 15.00, NULL, 75),
  ('c0000001-0000-0000-0000-000000000009', 'google', 'Banque/Assurance', 'Celine', 'Robin', 'c.robin@example.fr', '0612345020', '13004', 'generated', 28.00, NULL, 68),
  -- Leads dead (20)
  ('c0000001-0000-0000-0000-000000000010', 'google', 'Silver', 'Gerard', 'Fontaine', 'g.fontaine@example.fr', '0612345021', '75005', 'dead', 24.00, NULL, 30),
  ('c0000001-0000-0000-0000-000000000014', 'sms', 'Formation', 'Sylvie', 'Robert', 's.robert@example.fr', '0612345022', '69005', 'dead', 7.00, NULL, 25),
  -- Leads purchased (15)
  (NULL, 'affiliation', 'Banque/Assurance', 'Fabien', 'Dubois', 'f.dubois@example.fr', '0612345023', '44002', 'purchased', 45.00, NULL, 82),
  (NULL, 'affiliation', 'Travaux', 'Valerie', 'Masson', 'v.masson@example.fr', '0612345024', '67002', 'purchased', 50.00, NULL, 78),
  (NULL, 'co-reg', 'Silver', 'Michel', 'Henry', 'm.henry@example.fr', '0612345025', '35002', 'purchased', 38.00, NULL, 72)
ON CONFLICT DO NOTHING;

-- Ventes de leads (lier certains leads vendus aux acheteurs top)
INSERT INTO wm_lead_sales (lead_id, buyer_id, price, sold_at)
SELECT l.id, 'b0000001-0000-0000-0000-000000000001', l.sale_price, l.updated_at
FROM wm_leads l WHERE l.status='sold' AND l.thematic='Investissement' LIMIT 5;

INSERT INTO wm_lead_sales (lead_id, buyer_id, price, sold_at)
SELECT l.id, 'b0000001-0000-0000-0000-000000000002', l.sale_price, l.updated_at
FROM wm_leads l WHERE l.status='sold' AND l.thematic IN ('Travaux','Banque/Assurance') LIMIT 6;

INSERT INTO wm_lead_sales (lead_id, buyer_id, price, sold_at)
SELECT l.id, 'b0000001-0000-0000-0000-000000000005', l.sale_price, l.updated_at
FROM wm_leads l WHERE l.status='sold' AND l.thematic='B2B' LIMIT 3;

-- Achats de leads externes
INSERT INTO wm_lead_purchases (source_provider, price, thematic, volume, purchased_at) VALUES
  ('Affilae Network', 45.00, 'Banque/Assurance', 10, '2026-02-15'),
  ('LeadStation', 50.00, 'Travaux', 15, '2026-03-01'),
  ('Senior Leads Pro', 38.00, 'Silver', 20, '2026-03-10'),
  ('B2B Data', 80.00, 'B2B', 5, '2026-03-20')
ON CONFLICT DO NOTHING;

-- Factures demo
INSERT INTO wm_invoices (id, buyer_id, number, lines, amount_ht, amount_ttc, status, issued_on, due_on, paid_on) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 'WM-2026-001', '[{"desc":"Investissement - 800 leads", "qty": 800, "unit_price": 140, "total": 112000}]', 112000, 134400, 'paid', '2026-01-31', '2026-02-28', '2026-02-15'),
  ('f0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 'WM-2026-002', '[{"desc":"Travaux - 600 leads", "qty": 600, "unit_price": 155, "total": 93000}]', 93000, 111600, 'sent', '2026-02-28', '2026-03-30', NULL),
  ('f0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000003', 'WM-2026-003', '[{"desc":"Formation - 450 leads", "qty": 450, "unit_price": 162, "total": 72900}]', 72900, 87480, 'draft', '2026-03-31', '2026-04-30', NULL)
ON CONFLICT (id) DO NOTHING;
