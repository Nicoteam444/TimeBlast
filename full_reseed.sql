-- ═══════════════════════════════════════════════════════════════
-- TIMEBLAST — Full Reseed
-- Exécuter dans Supabase → SQL Editor (une seule fois)
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 0. MIGRATIONS (idempotentes)
-- ─────────────────────────────────────────────────────────────────

-- Colonne ville sur societes
ALTER TABLE societes ADD COLUMN IF NOT EXISTS ville text;

-- Table groupes
CREATE TABLE IF NOT EXISTS groupes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now(),
  name        text NOT NULL,
  description text,
  color       text DEFAULT '#1a5c82'
);
ALTER TABLE groupes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groupes_select" ON groupes;
DROP POLICY IF EXISTS "groupes_admin"  ON groupes;
CREATE POLICY "groupes_select" ON groupes FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "groupes_admin" ON groupes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lien societes → groupes
ALTER TABLE societes ADD COLUMN IF NOT EXISTS groupe_id uuid REFERENCES groupes(id) ON DELETE SET NULL;

-- Lien profiles → groupes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS groupe_id uuid REFERENCES groupes(id) ON DELETE SET NULL;

-- Lien profiles → societes
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id) ON DELETE SET NULL;

-- Colonnes societe_id sur clients et transactions
ALTER TABLE clients      ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);

CREATE INDEX IF NOT EXISTS idx_clients_societe_id      ON clients(societe_id);
CREATE INDEX IF NOT EXISTS idx_transactions_societe_id ON transactions(societe_id);

-- Colonne phase sur transactions (si pas encore là)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS phase               text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS date_fermeture_prevue date;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS notes               text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS montant             numeric(15,2) DEFAULT 0;

-- RLS policy étendue pour societes (manager peut lire)
DROP POLICY IF EXISTS "societes_all" ON societes;
DROP POLICY IF EXISTS "societes_admin" ON societes;
CREATE POLICY "societes_admin" ON societes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')
  ));

-- ─────────────────────────────────────────────────────────────────
-- 1. GROUPES
-- ─────────────────────────────────────────────────────────────────

TRUNCATE groupes CASCADE;

INSERT INTO groupes (id, name, description, color) VALUES
  ('11111111-0001-0000-0000-000000000000', 'Groupe SRA',          'Entités SRA territoriales France',    '#1a5c82'),
  ('11111111-0002-0000-0000-000000000000', 'SRA International',   'Filiales et partenaires outre-mer',   '#0891b2'),
  ('11111111-0003-0000-0000-000000000000', 'SRA Numérique',       'DSI, intégration et solutions IT',    '#7c3aed'),
  ('11111111-0004-0000-0000-000000000000', 'Partenaires Créatifs','Agences, création et médias',         '#ec4899');

-- ─────────────────────────────────────────────────────────────────
-- 2. SOCIETES
-- ─────────────────────────────────────────────────────────────────

TRUNCATE societes CASCADE;   -- cascade : clients, transactions liés seront supprimés aussi

INSERT INTO societes (id, name, siren, ville, groupe_id) VALUES
  -- Groupe SRA France
  ('22222222-0001-0000-0000-000000000000', 'SRA Centre',      '410123001', 'Lyon',       '11111111-0001-0000-0000-000000000000'),
  ('22222222-0002-0000-0000-000000000000', 'SRA Ouest',       '410123002', 'Nantes',     '11111111-0001-0000-0000-000000000000'),
  ('22222222-0003-0000-0000-000000000000', 'SRA Sud-Ouest',   '410123003', 'Bordeaux',   '11111111-0001-0000-0000-000000000000'),
  ('22222222-0004-0000-0000-000000000000', 'SRA Sud-Est',     '410123004', 'Marseille',  '11111111-0001-0000-0000-000000000000'),
  -- SRA International
  ('22222222-0005-0000-0000-000000000000', 'SRA Réunion',     '410123005', 'Saint-Denis','11111111-0002-0000-0000-000000000000'),
  ('22222222-0006-0000-0000-000000000000', 'SRA Antilles',    '410123006', 'Fort-de-France','11111111-0002-0000-0000-000000000000'),
  ('22222222-0007-0000-0000-000000000000', 'SRA Afrique',     '410123007', 'Dakar',      '11111111-0002-0000-0000-000000000000'),
  ('22222222-0008-0000-0000-000000000000', 'SRA MADAGASCAR',  '410123008', 'Antananarivo','11111111-0002-0000-0000-000000000000'),
  -- SRA Numérique
  ('22222222-0009-0000-0000-000000000000', 'SRA Informatique','410123009', 'Paris',      '11111111-0003-0000-0000-000000000000'),
  ('22222222-0010-0000-0000-000000000000', 'SRA INTEGRATION', '410123010', 'Toulouse',   '11111111-0003-0000-0000-000000000000'),
  ('22222222-0011-0000-0000-000000000000', 'SRA SOLUTIONS',   '410123011', 'Paris',      '11111111-0003-0000-0000-000000000000'),
  -- Partenaires Créatifs
  ('22222222-0012-0000-0000-000000000000', 'WEBMEDIA RM',     '410123012', 'Paris',      '11111111-0004-0000-0000-000000000000'),
  ('22222222-0013-0000-0000-000000000000', 'PILOT''IN',       '410123013', 'Paris',      '11111111-0004-0000-0000-000000000000'),
  ('22222222-0014-0000-0000-000000000000', 'LES IMAGEURS',    '410123014', 'Paris',      '11111111-0004-0000-0000-000000000000'),
  ('22222222-0015-0000-0000-000000000000', 'HEXAGRAM',        '410123015', 'Paris',      '11111111-0004-0000-0000-000000000000'),
  -- Demo / Test
  ('22222222-0016-0000-0000-000000000000', 'SRA TEST',        NULL,        'Paris',      '11111111-0001-0000-0000-000000000000'),
  -- SRA Services
  ('22222222-0017-0000-0000-000000000000', 'SRA Services',    '410123017', 'Rennes',     '11111111-0001-0000-0000-000000000000');

-- ─────────────────────────────────────────────────────────────────
-- 3. CLIENTS + TRANSACTIONS + PROJETS
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  s_centre      uuid := '22222222-0001-0000-0000-000000000000';
  s_ouest       uuid := '22222222-0002-0000-0000-000000000000';
  s_sudouest    uuid := '22222222-0003-0000-0000-000000000000';
  s_sudest      uuid := '22222222-0004-0000-0000-000000000000';
  s_reunion     uuid := '22222222-0005-0000-0000-000000000000';
  s_antilles    uuid := '22222222-0006-0000-0000-000000000000';
  s_afrique     uuid := '22222222-0007-0000-0000-000000000000';
  s_madagascar  uuid := '22222222-0008-0000-0000-000000000000';
  s_info        uuid := '22222222-0009-0000-0000-000000000000';
  s_integration uuid := '22222222-0010-0000-0000-000000000000';
  s_solutions   uuid := '22222222-0011-0000-0000-000000000000';
  s_webmedia    uuid := '22222222-0012-0000-0000-000000000000';
  s_pilotin     uuid := '22222222-0013-0000-0000-000000000000';
  s_imageurs    uuid := '22222222-0014-0000-0000-000000000000';
  s_hexagram    uuid := '22222222-0015-0000-0000-000000000000';
  s_services    uuid := '22222222-0017-0000-0000-000000000000';

  c1 uuid; c2 uuid; c3 uuid; c4 uuid;
BEGIN

-- ══════════════════
-- SRA Centre
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Lyon', s_centre) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('CHU de Clermont-Ferrand', s_centre) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Région Auvergne-Rhône-Alpes', s_centre) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Métropole de Lyon', s_centre) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Refonte SI RH — Mairie de Lyon',       c1, s_centre, 120000, 'ferme_a_gagner', '2026-06-30', 'Projet pluriannuel'),
  ('Audit cybersécurité CHU Clermont',     c2, s_centre,  45000, 'short_list',     '2026-04-15', 'Concurrence 2 cabinets'),
  ('Schéma directeur SI — Région AURA',   c3, s_centre, 280000, 'qualification',  '2026-09-30', 'Cadrage budgétaire'),
  ('Dématérialisation RH — Métropole Lyon',c4, s_centre,  85000, 'ferme',          '2026-03-31', 'Contrat signé'),
  ('Accompagnement RGPD — CHU Clermont',  c2, s_centre,  22000, 'perdu',           '2025-12-31', 'Perdu prestataire local');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Refonte SI RH Mairie de Lyon', c1, 150, 'actif'),
  ('Audit Cyber CHU Clermont',     c2,  45, 'actif'),
  ('RGPD Région AURA',             c3,  30, 'termine');

-- ══════════════════
-- SRA Ouest
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Nantes', s_ouest) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Conseil Régional de Bretagne', s_ouest) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('CHU de Rennes', s_ouest) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Nantes Métropole', s_ouest) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Transformation numérique — Mairie Nantes',     c1, s_ouest, 175000, 'ferme_a_gagner', '2026-07-31', 'Projet phare 2026-2030'),
  ('Schéma directeur numérique — Région Bretagne', c2, s_ouest, 320000, 'qualification',  '2026-10-31', 'Appel projet lancé'),
  ('Pilotage DSI mutualisée — CHU Rennes',         c3, s_ouest,  95000, 'short_list',     '2026-05-15', 'Entretiens avril'),
  ('Optimisation achats — Nantes Métropole',       c4, s_ouest,  60000, 'ferme',          '2026-04-01', 'Démarrage immédiat'),
  ('Audit conformité — CHU Rennes',                c3, s_ouest,  18000, 'perdu',           '2025-11-30', 'Budget non alloué');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Transformation numérique Nantes',      c1, 200, 'actif'),
  ('Schéma directeur Bretagne',            c2,  80, 'suspendu'),
  ('Optimisation achats Nantes Métropole', c4,  60, 'actif');

-- ══════════════════
-- SRA Sud-Ouest
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Bordeaux', s_sudouest) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('CHU de Bordeaux', s_sudouest) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Région Nouvelle-Aquitaine', s_sudouest) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Bordeaux Métropole', s_sudouest) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('SI Finance — Mairie de Bordeaux',              c1, s_sudouest,  98000, 'ferme',          '2026-03-15', 'Contrat finalisé'),
  ('Plan continuité activité — CHU Bordeaux',      c2, s_sudouest,  72000, 'ferme_a_gagner', '2026-06-30', 'Favorable soutenance'),
  ('Gouvernance data — Région Nouvelle-Aquitaine', c3, s_sudouest, 240000, 'short_list',     '2026-08-31', 'Délibération juillet'),
  ('Smart City — Bordeaux Métropole',              c4, s_sudouest, 180000, 'qualification',  '2026-12-31', 'Phase préliminaire'),
  ('Migration cloud — CHU Bordeaux',               c2, s_sudouest,  55000, 'perdu',           '2025-10-31', 'Retenu en interne');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('SI Finance Bordeaux',             c1, 120, 'actif'),
  ('PCA CHU Bordeaux',                c2,  90, 'actif'),
  ('Gouvernance data Nouvelle-Aquitaine', c3, 60, 'suspendu');

-- ══════════════════
-- SRA Sud-Est
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Marseille', s_sudest) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('AP-HM Hôpitaux de Marseille', s_sudest) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Région PACA', s_sudest) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Aix-Marseille-Provence Métropole', s_sudest) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Smart City — Mairie de Marseille',   c1, s_sudest, 310000, 'ferme_a_gagner', '2026-07-31', 'Projet Euroméditerranée'),
  ('DPI mutualisé — AP-HM',              c2, s_sudest, 480000, 'short_list',     '2026-10-31', 'DGOS financement'),
  ('Plan numérique — Région PACA',       c3, s_sudest, 260000, 'qualification',  '2026-12-31', 'Consultation juillet'),
  ('SI Mobilité — AMP Métropole',        c4, s_sudest, 195000, 'ferme',          '2026-05-01', 'Contrat signé mars 2026'),
  ('Audit cloud — AP-HM',                c2, s_sudest,  42000, 'perdu',           '2025-12-31', 'Budget gelé');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Smart City Marseille',      c1, 320, 'actif'),
  ('DPI AP-HM',                 c2, 500, 'suspendu'),
  ('SI Mobilité AMP Métropole', c4, 210, 'actif');

-- ══════════════════
-- SRA Réunion
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Saint-Denis', s_reunion) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('CHU de La Réunion', s_reunion) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Région Réunion', s_reunion) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Département de La Réunion', s_reunion) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Refonte portail citoyen — Saint-Denis',      c1, s_reunion,  65000, 'ferme',          '2026-04-30', 'Validé en conseil'),
  ('Télémédecine — CHU Réunion',                 c2, s_reunion, 130000, 'ferme_a_gagner', '2026-07-31', 'Cofinancement ARS'),
  ('Schéma régional numérique — Région Réunion', c3, s_reunion, 190000, 'qualification',  '2026-11-30', 'RFP attendu juin'),
  ('Inclusion numérique — Département Réunion',  c4, s_reunion,  48000, 'short_list',     '2026-05-31', '2 candidats restants');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Portail citoyen Saint-Denis', c1,  80, 'actif'),
  ('Télémédecine CHU Réunion',    c2, 110, 'actif'),
  ('Inclusion numérique Réunion', c4,  50, 'termine');

-- ══════════════════
-- SRA Antilles
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Mairie de Fort-de-France', s_antilles) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('CHU de Martinique', s_antilles) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Région Guadeloupe', s_antilles) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Collectivité Territoriale de Martinique', s_antilles) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('SI Urbanisme — Fort-de-France',          c1, s_antilles,  78000, 'ferme_a_gagner', '2026-06-30', 'Commission mai'),
  ('GHT numérique — CHU Martinique',         c2, s_antilles, 155000, 'short_list',     '2026-09-30', 'Consultation cours'),
  ('Plan Transition Numérique — Guadeloupe', c3, s_antilles, 210000, 'qualification',  '2026-12-31', 'Premier contact'),
  ('Dématérialisation — CTM',                c4, s_antilles,  55000, 'ferme',          '2026-03-31', 'Mission démarrée'),
  ('Audit infrastructure — Fort-de-France',  c1, s_antilles,  25000, 'perdu',           '2025-09-30', 'Budget indisponible');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('SI Urbanisme Fort-de-France', c1,  95, 'actif'),
  ('GHT CHU Martinique',          c2, 130, 'suspendu'),
  ('Dématérialisation CTM',       c4,  65, 'actif');

-- ══════════════════
-- SRA Afrique
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Ministère des Finances — Côte d''Ivoire', s_afrique) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('SONATEL Sénégal', s_afrique) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('SGBS — Société Générale Banque Sénégal', s_afrique) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Office National des Postes — Cameroun', s_afrique) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('GFP — Ministère Finances CI',             c1, s_afrique, 580000, 'ferme_a_gagner', '2026-06-30', 'Financement AFD/BM'),
  ('SI RH — SONATEL',                         c2, s_afrique, 220000, 'ferme',          '2026-04-01', 'Contrat cadre signé'),
  ('Core banking SGBS',                       c3, s_afrique, 310000, 'short_list',     '2026-09-30', 'Appel restreint'),
  ('Transformation numérique — ONP Cameroun', c4, s_afrique, 175000, 'qualification',  '2026-12-31', 'Étude faisabilité');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('SI RH SONATEL',     c2, 250, 'actif'),
  ('GFP CI',            c1, 380, 'actif'),
  ('Core banking SGBS', c3, 290, 'suspendu');

-- ══════════════════
-- SRA Madagascar
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Jirama eau et électricité', s_madagascar) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Télécommunications de Madagascar', s_madagascar) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Ministère des Finances — Madagascar', s_madagascar) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('BNI Madagascar', s_madagascar) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('SI Facturation — Jirama',               c1, s_madagascar,  95000, 'ferme_a_gagner', '2026-06-30', 'Appui AFD'),
  ('Réseau fibres — Telma',                 c2, s_madagascar, 210000, 'short_list',     '2026-09-30', 'Financement BM'),
  ('GFP — Ministère Finances Madagascar',  c3, s_madagascar, 380000, 'qualification',  '2026-12-31', 'Projet PEFA'),
  ('Core banking upgrade — BNI Madagascar', c4, s_madagascar, 140000, 'ferme',          '2026-04-30', 'Démarrage Q2');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('SI Facturation Jirama',       c1, 120, 'actif'),
  ('Core banking BNI Madagascar', c4, 160, 'actif'),
  ('GFP Finances Madagascar',     c3, 200, 'suspendu');

-- ══════════════════
-- SRA Informatique
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Groupe Crédit Agricole DSI', s_info) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Orange Business Services', s_info) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Airbus Defence Space', s_info) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('La Poste Direction Numérique', s_info) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Migration Azure — Crédit Agricole DSI', c1, s_info, 350000, 'ferme',          '2026-04-01', 'SOW signé'),
  ('Audit réseau — Orange Business',        c2, s_info,  90000, 'ferme_a_gagner', '2026-06-15', 'Favorable POC'),
  ('Infrastructure HPC — Airbus',           c3, s_info, 520000, 'short_list',     '2026-09-30', '3 finalistes'),
  ('Modernisation middleware — La Poste',   c4, s_info, 185000, 'qualification',  '2026-11-30', 'Cadrage en cours'),
  ('DevSecOps — Crédit Agricole DSI',       c1, s_info, 140000, 'ferme_a_gagner', '2026-07-31', 'Suite migration Azure');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Migration Azure CA DSI', c1, 400, 'actif'),
  ('Audit réseau Orange',    c2,  80, 'actif'),
  ('HPC Airbus',             c3, 500, 'suspendu');

-- ══════════════════
-- SRA Integration
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Carrefour Direction Logistique', s_integration) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Michelin DSI Industrielle', s_integration) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Safran Group', s_integration) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Decathlon E-commerce', s_integration) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Plateforme EDI — Carrefour Logistique', c1, s_integration, 290000, 'ferme',          '2026-04-15', 'Contrat cadre 3 ans'),
  ('API Gateway industrielle — Michelin',   c2, s_integration, 175000, 'ferme_a_gagner', '2026-07-31', 'POC concluant'),
  ('Intégration ERP-MES — Safran',          c3, s_integration, 440000, 'short_list',     '2026-10-31', 'Appel restreint'),
  ('Connecteurs marketplace — Decathlon',   c4, s_integration,  85000, 'qualification',  '2026-12-31', 'Phase étude'),
  ('Migration API v2 — Carrefour',          c1, s_integration,  95000, 'perdu',           '2025-12-31', 'Développé en interne');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Plateforme EDI Carrefour', c1, 350, 'actif'),
  ('API Gateway Michelin',     c2, 180, 'actif'),
  ('Intégration ERP Safran',   c3, 480, 'suspendu');

-- ══════════════════
-- SRA Solutions
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Groupe BPCE Innovation', s_solutions) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('SNCF Réseau', s_solutions) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('EDF Renouvelables', s_solutions) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Alstom', s_solutions) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Plateforme data analytics — BPCE',      c1, s_solutions, 420000, 'ferme',          '2026-03-31', 'GO validé'),
  ('Asset management — SNCF Réseau',        c2, s_solutions, 290000, 'ferme_a_gagner', '2026-07-31', 'En cours arbitrage'),
  ('Suivi parc éolien — EDF Renouvelables', c3, s_solutions, 185000, 'short_list',     '2026-09-30', '2 offres'),
  ('MES industrie — Alstom',                c4, s_solutions, 340000, 'qualification',  '2026-12-31', 'RFI en cours'),
  ('BI décisionnel — BPCE',                 c1, s_solutions, 110000, 'perdu',           '2025-11-30', 'Salesforce retenu');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Data analytics BPCE',     c1, 450, 'actif'),
  ('Asset management SNCF',   c2, 280, 'actif'),
  ('Suivi parc éolien EDF',   c3, 200, 'suspendu');

-- ══════════════════
-- WEBMEDIA RM
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Galeries Lafayette E-commerce', s_webmedia) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Groupe M6', s_webmedia) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Lagardère Travel Retail', s_webmedia) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Club Med', s_webmedia) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Refonte e-commerce — Galeries Lafayette', c1, s_webmedia, 280000, 'ferme',          '2026-04-01', 'Sprint 1 lancé'),
  ('Plateforme VOD — Groupe M6',              c2, s_webmedia, 390000, 'ferme_a_gagner', '2026-08-31', 'Finalistes 2'),
  ('Appli mobile duty-free — Lagardère',      c3, s_webmedia, 155000, 'short_list',     '2026-06-30', 'RFP soumis'),
  ('Site réservation — Club Med',             c4, s_webmedia, 210000, 'qualification',  '2026-11-30', 'Brief reçu'),
  ('SEO & Analytics — Galeries Lafayette',    c1, s_webmedia,  45000, 'perdu',           '2025-10-31', 'Alloué en interne');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('E-commerce Galeries Lafayette', c1, 300, 'actif'),
  ('VOD M6',                        c2, 350, 'actif'),
  ('Mobile Lagardère',              c3, 150, 'suspendu');

-- ══════════════════
-- PILOT'IN
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Koesio Group', s_pilotin) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Axians France', s_pilotin) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Gfi Informatique', s_pilotin) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Hardis Group', s_pilotin) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Solution PMO — Koesio Group',           c1, s_pilotin,  98000, 'ferme',          '2026-03-31', 'Licence annuelle signée'),
  ('Pilotage portefeuille — Axians',        c2, s_pilotin, 145000, 'ferme_a_gagner', '2026-06-30', 'POC positif'),
  ('Tableau de bord DG — Gfi Informatique', c3, s_pilotin,  72000, 'short_list',     '2026-05-31', 'Présentation mai'),
  ('Outil COPIL — Hardis Group',            c4, s_pilotin,  55000, 'qualification',  '2026-09-30', 'En discussion');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('PMO Koesio',          c1,  90, 'actif'),
  ('Portefeuille Axians', c2, 120, 'actif'),
  ('Tableau DG Gfi',      c3,  60, 'termine');

-- ══════════════════
-- LES IMAGEURS
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Publicis Groupe', s_imageurs) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Havas Media France', s_imageurs) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Événements Paris 2026', s_imageurs) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Châteaux & Hôtels Collection', s_imageurs) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Reportages produits — Publicis',           c1, s_imageurs,  68000, 'ferme',          '2026-04-15', 'Tournage juin'),
  ('Campagne vidéo — Havas Media',             c2, s_imageurs,  95000, 'ferme_a_gagner', '2026-07-31', 'Devis validé'),
  ('Couverture photo événements — Paris 2026', c3, s_imageurs, 120000, 'short_list',     '2026-05-31', 'Commission presse'),
  ('Shooting hôtels — Châteaux & Hôtels',     c4, s_imageurs,  52000, 'qualification',  '2026-09-30', 'Premier contact');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Reportages Publicis',      c1,  45, 'actif'),
  ('Vidéo Havas',              c2,  60, 'actif'),
  ('Shooting Châteaux Hôtels', c4,  35, 'termine');

-- ══════════════════
-- HEXAGRAM
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Station F Startups', s_hexagram) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Criteo', s_hexagram) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Deezer', s_hexagram) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Ledger crypto', s_hexagram) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Branding & UX — Station F',      c1, s_hexagram,  82000, 'ferme',          '2026-04-01', 'Retainer annuel'),
  ('Design system — Criteo',         c2, s_hexagram, 165000, 'ferme_a_gagner', '2026-07-31', 'Workshops cours'),
  ('Expérience utilisateur — Deezer', c3, s_hexagram, 130000, 'short_list',    '2026-06-30', 'Compétition créative'),
  ('Identity & Packaging — Ledger',  c4, s_hexagram,  95000, 'qualification',  '2026-10-31', 'Brief reçu'),
  ('Motion design — Criteo',         c2, s_hexagram,  48000, 'perdu',           '2025-11-30', 'Freelance retenu');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Branding Station F',   c1,  75, 'actif'),
  ('Design system Criteo', c2, 140, 'actif'),
  ('UX Deezer',            c3, 110, 'suspendu');

-- ══════════════════
-- SRA Services
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Groupe Rocher', s_services) RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Fleury Michon', s_services) RETURNING id INTO c2;
INSERT INTO clients (name, societe_id) VALUES ('Bigard Group', s_services) RETURNING id INTO c3;
INSERT INTO clients (name, societe_id) VALUES ('Socotec', s_services) RETURNING id INTO c4;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('TMA applicative — Groupe Rocher',      c1, s_services, 220000, 'ferme',          '2026-01-01', 'Contrat annuel reconduit'),
  ('Support N2/N3 — Fleury Michon',        c2, s_services, 148000, 'ferme_a_gagner', '2026-05-31', 'Renouvellement mai'),
  ('Infogérance partielle — Bigard Group', c3, s_services, 310000, 'short_list',     '2026-08-31', 'Appel en cours'),
  ('ITSM ServiceNow — Socotec',            c4, s_services,  72000, 'qualification',  '2026-11-30', 'Démo en cours');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('TMA Groupe Rocher',     c1, 260, 'actif'),
  ('Support Fleury Michon', c2, 170, 'actif'),
  ('ITSM Socotec',          c4,  90, 'termine');

-- ══════════════════
-- SRA TEST (démo)
-- ══════════════════
INSERT INTO clients (name, societe_id) VALUES ('Client Démo A', '22222222-0016-0000-0000-000000000000') RETURNING id INTO c1;
INSERT INTO clients (name, societe_id) VALUES ('Client Démo B', '22222222-0016-0000-0000-000000000000') RETURNING id INTO c2;
INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
  ('Mission test 1', c1, '22222222-0016-0000-0000-000000000000', 50000, 'ferme',          '2026-06-30', 'Environnement de démo'),
  ('Mission test 2', c2, '22222222-0016-0000-0000-000000000000', 30000, 'ferme_a_gagner', '2026-09-30', 'Test pipeline');
INSERT INTO projets (name, client_id, total_jours, statut) VALUES
  ('Projet Démo Alpha', c1, 50, 'actif'),
  ('Projet Démo Beta',  c2, 30, 'actif');

END $$;

-- ─────────────────────────────────────────────────────────────────
-- 4. Mettre à jour le profil de Nicolas (admin) avec SRA TEST
-- ─────────────────────────────────────────────────────────────────
UPDATE profiles
SET societe_id = '22222222-0016-0000-0000-000000000000',
    groupe_id  = '11111111-0001-0000-0000-000000000000'
WHERE id = '9c9bae62-f04f-45dc-8974-7422cb79905f';

-- ─────────────────────────────────────────────────────────────────
-- 5. Fonctions SQL utilitaires (recréation idempotente)
-- ─────────────────────────────────────────────────────────────────

-- get_my_role : évite récursion RLS sur profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- get_users_with_auth : joint profiles + auth.users
CREATE OR REPLACE FUNCTION get_users_with_auth()
RETURNS TABLE (
  id                uuid,
  full_name         text,
  email             text,
  role              text,
  societe_id        uuid,
  groupe_id         uuid,
  created_at        timestamptz,
  last_sign_in_at   timestamptz,
  email_confirmed_at timestamptz,
  invited_at        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.full_name,
    u.email,
    p.role,
    p.societe_id,
    p.groupe_id,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    u.invited_at
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

-- ─────────────────────────────────────────────────────────────────
-- ✅ RÉSUMÉ FINAL
-- ─────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM groupes)      AS nb_groupes,
  (SELECT COUNT(*) FROM societes)     AS nb_societes,
  (SELECT COUNT(*) FROM clients)      AS nb_clients,
  (SELECT COUNT(*) FROM transactions) AS nb_transactions,
  (SELECT COUNT(*) FROM projets)      AS nb_projets;
