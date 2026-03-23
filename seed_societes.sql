-- ============================================================
-- seed_societes.sql
-- Ajoute societe_id aux tables clients et transactions,
-- puis insère des données de démo réalistes pour chaque société.
-- ============================================================

-- 1. Colonnes societe_id
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);

-- 2. Index optionnels pour les performances
CREATE INDEX IF NOT EXISTS idx_clients_societe_id     ON clients(societe_id);
CREATE INDEX IF NOT EXISTS idx_transactions_societe_id ON transactions(societe_id);

-- 3. Données de démo
DO $$
DECLARE
  v_societe_id uuid;
  v_client1_id uuid;
  v_client2_id uuid;
  v_client3_id uuid;
  v_client4_id uuid;
BEGIN

  -- ===========================
  -- SRA Centre (Lyon / AURA)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Centre';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Lyon', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('CHU de Clermont-Ferrand', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Région Auvergne-Rhône-Alpes', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Métropole de Lyon', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Refonte SI RH — Mairie de Lyon',         v_client1_id, v_societe_id, 120000, 'ferme_a_gagner', '2026-06-30', 'Projet pluriannuel, décision Q2 2026'),
      ('Audit cybersécurité CHU Clermont',        v_client2_id, v_societe_id,  45000, 'short_list',     '2026-04-15', 'Concurrence avec 2 autres cabinets'),
      ('Schéma directeur SI — Région AURA',       v_client3_id, v_societe_id, 280000, 'qualification',  '2026-09-30', 'En cours de cadrage budgétaire'),
      ('Dématérialisation RH — Métropole Lyon',   v_client4_id, v_societe_id,  85000, 'ferme',          '2026-03-31', 'Contrat signé, démarrage avril'),
      ('Accompagnement RGPD — CHU Clermont',      v_client2_id, v_societe_id,  22000, 'perdu',          '2025-12-31', 'Perdu au profit d''un prestataire local');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Refonte SI RH Mairie de Lyon',   v_client1_id, 150, 'actif'),
      ('Audit Cyber CHU Clermont',       v_client2_id,  45, 'actif'),
      ('RGPD Région AURA',               v_client3_id,  30, 'termine');

  END IF;

  -- ===========================
  -- SRA Ouest (Nantes / Bretagne)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Ouest';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Nantes', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Conseil Régional de Bretagne', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('CHU de Rennes', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Nantes Métropole', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Transformation numérique — Mairie Nantes',    v_client1_id, v_societe_id, 175000, 'ferme_a_gagner', '2026-07-31', 'Projet phare mandat 2026-2030'),
      ('Schéma directeur numérique — Région Bretagne',v_client2_id, v_societe_id, 320000, 'qualification',  '2026-10-31', 'Appel à projet lancé en janvier'),
      ('Pilotage DSI mutualisée — CHU Rennes',        v_client3_id, v_societe_id,  95000, 'short_list',     '2026-05-15', 'Entretiens prévus en avril'),
      ('Optimisation achats — Nantes Métropole',      v_client4_id, v_societe_id,  60000, 'ferme',          '2026-04-01', 'Démarrage immédiat'),
      ('Audit conformité — CHU Rennes',               v_client3_id, v_societe_id,  18000, 'perdu',          '2025-11-30', 'Budget non alloué cette année');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Transformation numérique Nantes',      v_client1_id, 200, 'actif'),
      ('Schéma directeur Bretagne',            v_client2_id,  80, 'suspendu'),
      ('Optimisation achats Nantes Métropole', v_client4_id,  60, 'actif');

  END IF;

  -- ===========================
  -- SRA Sud-Ouest (Bordeaux / Nouvelle-Aquitaine)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Sud-Ouest';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Bordeaux', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('CHU de Bordeaux', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Région Nouvelle-Aquitaine', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Bordeaux Métropole', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('SI Finance — Mairie de Bordeaux',            v_client1_id, v_societe_id,  98000, 'ferme',          '2026-03-15', 'Contrat finalisé'),
      ('Plan de continuité activité — CHU Bordeaux', v_client2_id, v_societe_id,  72000, 'ferme_a_gagner', '2026-06-30', 'Favorable après soutenance'),
      ('Gouvernance data — Région Nouvelle-Aquitaine',v_client3_id,v_societe_id, 240000, 'short_list',     '2026-08-31', 'Dossier remis, délibération en juillet'),
      ('Smart City — Bordeaux Métropole',            v_client4_id, v_societe_id, 180000, 'qualification',  '2026-12-31', 'Phase préliminaire d''étude'),
      ('Migration cloud — CHU Bordeaux',             v_client2_id, v_societe_id,  55000, 'perdu',          '2025-10-31', 'Retenu en interne');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('SI Finance Bordeaux',           v_client1_id, 120, 'actif'),
      ('PCA CHU Bordeaux',              v_client2_id,  90, 'actif'),
      ('Gouvernance data Nouvelle-Aquitaine', v_client3_id, 60, 'suspendu');

  END IF;

  -- ===========================
  -- SRA Réunion
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Réunion';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Saint-Denis', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('CHU de La Réunion', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Région Réunion', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Département de La Réunion', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Refonte portail citoyen — Saint-Denis',       v_client1_id, v_societe_id,  65000, 'ferme',          '2026-04-30', 'Validé en conseil municipal'),
      ('Télémédecine — CHU Réunion',                  v_client2_id, v_societe_id, 130000, 'ferme_a_gagner', '2026-07-31', 'Cofinancement ARS en cours'),
      ('Schéma régional numérique — Région Réunion',  v_client3_id, v_societe_id, 190000, 'qualification',  '2026-11-30', 'RFP attendu en juin'),
      ('Inclusion numérique — Département Réunion',   v_client4_id, v_societe_id,  48000, 'short_list',     '2026-05-31', '2 candidats restants');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Portail citoyen Saint-Denis',    v_client1_id,  80, 'actif'),
      ('Télémédecine CHU Réunion',       v_client2_id, 110, 'actif'),
      ('Inclusion numérique Réunion',    v_client4_id,  50, 'termine');

  END IF;

  -- ===========================
  -- SRA Antilles (Martinique / Guadeloupe)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Antilles';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Fort-de-France', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('CHU de Martinique', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Région Guadeloupe', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Collectivité Territoriale de Martinique', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('SI Urbanisme — Fort-de-France',              v_client1_id, v_societe_id,  78000, 'ferme_a_gagner', '2026-06-30', 'Commission en mai'),
      ('GHT numérique — CHU Martinique',             v_client2_id, v_societe_id, 155000, 'short_list',     '2026-09-30', 'Consultation en cours'),
      ('Plan Transition Numérique — Guadeloupe',     v_client3_id, v_societe_id, 210000, 'qualification',  '2026-12-31', 'Premier contact établi'),
      ('Dématérialisation — CTM',                    v_client4_id, v_societe_id,  55000, 'ferme',          '2026-03-31', 'Mission démarrée'),
      ('Audit infrastructure — Fort-de-France',      v_client1_id, v_societe_id,  25000, 'perdu',          '2025-09-30', 'Budget non disponible');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('SI Urbanisme Fort-de-France',    v_client1_id,  95, 'actif'),
      ('GHT CHU Martinique',             v_client2_id, 130, 'suspendu'),
      ('Dématérialisation CTM',          v_client4_id,  65, 'actif');

  END IF;

  -- ===========================
  -- SRA Informatique (IT / Infrastructure)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Informatique';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Groupe Crédit Agricole — DSI', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Orange Business Services', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Airbus Defence & Space', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('La Poste — Direction Numérique', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Migration Azure — Crédit Agricole DSI',     v_client1_id, v_societe_id, 350000, 'ferme',          '2026-04-01', 'SOW signé'),
      ('Audit réseau — Orange Business',             v_client2_id, v_societe_id,  90000, 'ferme_a_gagner', '2026-06-15', 'Favorable après POC'),
      ('Infrastructure HPC — Airbus',                v_client3_id, v_societe_id, 520000, 'short_list',     '2026-09-30', '3 finalistes'),
      ('Modernisation middleware — La Poste',        v_client4_id, v_societe_id, 185000, 'qualification',  '2026-11-30', 'En cours de cadrage'),
      ('DevSecOps — Crédit Agricole DSI',            v_client1_id, v_societe_id, 140000, 'ferme_a_gagner', '2026-07-31', 'Suite migration Azure');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Migration Azure CA DSI',         v_client1_id, 400, 'actif'),
      ('Audit réseau Orange',            v_client2_id,  80, 'actif'),
      ('HPC Airbus',                     v_client3_id, 500, 'suspendu');

  END IF;

  -- ===========================
  -- SRA INTEGRATION (EDI / API / Intégration)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA INTEGRATION';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Carrefour — Direction Logistique', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Michelin — DSI Industrielle', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Safran Group', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Decathlon — E-commerce', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Plateforme EDI — Carrefour Logistique',   v_client1_id, v_societe_id, 290000, 'ferme',          '2026-04-15', 'Contrat cadre 3 ans'),
      ('API Gateway industrielle — Michelin',     v_client2_id, v_societe_id, 175000, 'ferme_a_gagner', '2026-07-31', 'POC concluant'),
      ('Intégration ERP-MES — Safran',            v_client3_id, v_societe_id, 440000, 'short_list',     '2026-10-31', 'Appel d''offres restreint'),
      ('Connecteurs marketplace — Decathlon',     v_client4_id, v_societe_id,  85000, 'qualification',  '2026-12-31', 'Phase d''étude'),
      ('Migration API v2 — Carrefour Logistique', v_client1_id, v_societe_id,  95000, 'perdu',          '2025-12-31', 'Développé en interne');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Plateforme EDI Carrefour',   v_client1_id, 350, 'actif'),
      ('API Gateway Michelin',       v_client2_id, 180, 'actif'),
      ('Intégration ERP Safran',     v_client3_id, 480, 'suspendu');

  END IF;

  -- ===========================
  -- SRA Services (Managed Services / PME)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Services';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Groupe Rocher', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Fleury Michon', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Bigard Group', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Socotec', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('TMA applicative — Groupe Rocher',       v_client1_id, v_societe_id, 220000, 'ferme',          '2026-01-01', 'Contrat annuel reconduit'),
      ('Support N2/N3 — Fleury Michon',         v_client2_id, v_societe_id, 148000, 'ferme_a_gagner', '2026-05-31', 'Renouvellement en mai'),
      ('Infogérance partielle — Bigard Group',  v_client3_id, v_societe_id, 310000, 'short_list',     '2026-08-31', 'Appel d''offres en cours'),
      ('ITSM ServiceNow — Socotec',             v_client4_id, v_societe_id,  72000, 'qualification',  '2026-11-30', 'Démo en cours');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('TMA Groupe Rocher',        v_client1_id, 260, 'actif'),
      ('Support Fleury Michon',    v_client2_id, 170, 'actif'),
      ('ITSM Socotec',             v_client4_id,  90, 'termine');

  END IF;

  -- ===========================
  -- SRA MADAGASCAR
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA MADAGASCAR';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Jirama (eau et électricité)', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Télécommunications de Madagascar', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Ministère des Finances — Madagascar', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('BNI Madagascar', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('SI Facturation — Jirama',                  v_client1_id, v_societe_id,  95000, 'ferme_a_gagner', '2026-06-30', 'Appui AFD'),
      ('Réseau fibres — Telma',                    v_client2_id, v_societe_id, 210000, 'short_list',     '2026-09-30', 'Financement BM'),
      ('GFP — Ministère Finances Madagascar',      v_client3_id, v_societe_id, 380000, 'qualification',  '2026-12-31', 'Projet PEFA'),
      ('Core banking upgrade — BNI Madagascar',    v_client4_id, v_societe_id, 140000, 'ferme',          '2026-04-30', 'Démarrage Q2');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('SI Facturation Jirama',         v_client1_id, 120, 'actif'),
      ('Core banking BNI Madagascar',   v_client4_id, 160, 'actif'),
      ('GFP Finances Madagascar',       v_client3_id, 200, 'suspendu');

  END IF;

  -- ===========================
  -- SRA SOLUTIONS (Logiciels / Éditeur)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA SOLUTIONS';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Groupe BPCE — Innovation', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('SNCF Réseau', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('EDF Renouvelables', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Alstom', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Plateforme data analytics — BPCE',     v_client1_id, v_societe_id, 420000, 'ferme',          '2026-03-31', 'GO validé'),
      ('Asset management — SNCF Réseau',       v_client2_id, v_societe_id, 290000, 'ferme_a_gagner', '2026-07-31', 'En cours d''arbitrage'),
      ('Suivi parc éolien — EDF Renouvelables',v_client3_id, v_societe_id, 185000, 'short_list',     '2026-09-30', '2 offres en compétition'),
      ('MES industrie — Alstom',               v_client4_id, v_societe_id, 340000, 'qualification',  '2026-12-31', 'RFI en cours'),
      ('BI décisionnel — BPCE',                v_client1_id, v_societe_id, 110000, 'perdu',          '2025-11-30', 'Solution Salesforce retenue');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Data analytics BPCE',         v_client1_id, 450, 'actif'),
      ('Asset management SNCF',       v_client2_id, 280, 'actif'),
      ('Suivi parc éolien EDF',       v_client3_id, 200, 'suspendu');

  END IF;

  -- ===========================
  -- SRA Sud-Est (Marseille / PACA)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Sud-Est';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Mairie de Marseille', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('AP-HM (Hôpitaux de Marseille)', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Région PACA', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Aix-Marseille-Provence Métropole', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Smart City — Mairie de Marseille',       v_client1_id, v_societe_id, 310000, 'ferme_a_gagner', '2026-07-31', 'Projet Euroméditerranée'),
      ('DPI mutualisé — AP-HM',                  v_client2_id, v_societe_id, 480000, 'short_list',     '2026-10-31', 'DGOS financement'),
      ('Plan numérique — Région PACA',           v_client3_id, v_societe_id, 260000, 'qualification',  '2026-12-31', 'Consultation prévue en juillet'),
      ('SI Mobilité — AMP Métropole',            v_client4_id, v_societe_id, 195000, 'ferme',          '2026-05-01', 'Contrat signé mars 2026'),
      ('Audit cloud — AP-HM',                    v_client2_id, v_societe_id,  42000, 'perdu',          '2025-12-31', 'Budget gelé');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Smart City Marseille',        v_client1_id, 320, 'actif'),
      ('DPI AP-HM',                   v_client2_id, 500, 'suspendu'),
      ('SI Mobilité AMP Métropole',   v_client4_id, 210, 'actif');

  END IF;

  -- ===========================
  -- SRA Afrique (Afrique subsaharienne)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'SRA Afrique';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Ministère des Finances — Côte d''Ivoire', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('SONATEL (Sénégal)', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('SGBS — Société Générale Banque Sénégal', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Office National des Postes — Cameroun', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('GFP — Ministère Finances CI',            v_client1_id, v_societe_id, 580000, 'ferme_a_gagner', '2026-06-30', 'Financement AFD/BM'),
      ('SI RH — SONATEL',                        v_client2_id, v_societe_id, 220000, 'ferme',          '2026-04-01', 'Contrat cadre signé'),
      ('Core banking SGBS',                      v_client3_id, v_societe_id, 310000, 'short_list',     '2026-09-30', 'Appel d''offres restreint'),
      ('Transformation numérique — ONP Cameroun',v_client4_id, v_societe_id, 175000, 'qualification',  '2026-12-31', 'Étude de faisabilité');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('SI RH SONATEL',              v_client2_id, 250, 'actif'),
      ('GFP CI',                     v_client1_id, 380, 'actif'),
      ('Core banking SGBS',          v_client3_id, 290, 'suspendu');

  END IF;

  -- ===========================
  -- WEBMEDIA RM (Digital / Web Agency)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'WEBMEDIA RM';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Galeries Lafayette — E-commerce', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Groupe M6', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Lagardère Travel Retail', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Club Med', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Refonte e-commerce — Galeries Lafayette', v_client1_id, v_societe_id, 280000, 'ferme',          '2026-04-01', 'Sprint 1 lancé'),
      ('Plateforme VOD — Groupe M6',              v_client2_id, v_societe_id, 390000, 'ferme_a_gagner', '2026-08-31', 'Finalistes réduits à 2'),
      ('Appli mobile duty-free — Lagardère',      v_client3_id, v_societe_id, 155000, 'short_list',     '2026-06-30', 'RFP soumis'),
      ('Site réservation — Club Med',             v_client4_id, v_societe_id, 210000, 'qualification',  '2026-11-30', 'Brief reçu'),
      ('SEO & Analytics — Galeries Lafayette',    v_client1_id, v_societe_id,  45000, 'perdu',          '2025-10-31', 'Budget alloué en interne');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('E-commerce Galeries Lafayette', v_client1_id, 300, 'actif'),
      ('VOD M6',                        v_client2_id, 350, 'actif'),
      ('Mobile Lagardère',              v_client3_id, 150, 'suspendu');

  END IF;

  -- ===========================
  -- PILOT'IN (Management / Pilotage)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'PILOT''IN';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Koesio Group', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Axians France', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Gfi Informatique', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Hardis Group', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Solution PMO — Koesio Group',          v_client1_id, v_societe_id,  98000, 'ferme',          '2026-03-31', 'Licence annuelle signée'),
      ('Pilotage portefeuille — Axians',       v_client2_id, v_societe_id, 145000, 'ferme_a_gagner', '2026-06-30', 'POC positif'),
      ('Tableau de bord DG — Gfi Informatique',v_client3_id, v_societe_id,  72000, 'short_list',     '2026-05-31', 'Présentation finale mai'),
      ('Outil COPIL — Hardis Group',           v_client4_id, v_societe_id,  55000, 'qualification',  '2026-09-30', 'En discussion');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('PMO Koesio',           v_client1_id,  90, 'actif'),
      ('Portefeuille Axians',  v_client2_id, 120, 'actif'),
      ('Tableau DG Gfi',       v_client3_id,  60, 'termine');

  END IF;

  -- ===========================
  -- LES IMAGEURS (Photo / Vidéo / Créatif)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'LES IMAGEURS';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Publicis Groupe', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Havas Media France', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Événements Paris 2026', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Châteaux & Hôtels Collection', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Reportages produits — Publicis',           v_client1_id, v_societe_id,  68000, 'ferme',          '2026-04-15', 'Brief reçu, tournage juin'),
      ('Campagne vidéo — Havas Media',             v_client2_id, v_societe_id,  95000, 'ferme_a_gagner', '2026-07-31', 'Devis validé'),
      ('Couverture photo événements — Paris 2026', v_client3_id, v_societe_id, 120000, 'short_list',     '2026-05-31', 'Commission presse'),
      ('Shooting hôtels — Châteaux & Hôtels',     v_client4_id, v_societe_id,  52000, 'qualification',  '2026-09-30', 'Premier contact');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Reportages Publicis',       v_client1_id,  45, 'actif'),
      ('Vidéo Havas',               v_client2_id,  60, 'actif'),
      ('Shooting Châteaux Hôtels',  v_client4_id,  35, 'termine');

  END IF;

  -- ===========================
  -- HEXAGRAM (Creative Tech / Startups)
  -- ===========================
  SELECT id INTO v_societe_id FROM societes WHERE name = 'HEXAGRAM';
  IF v_societe_id IS NOT NULL THEN

    INSERT INTO clients (name, societe_id) VALUES ('Station F — Startups', v_societe_id) RETURNING id INTO v_client1_id;
    INSERT INTO clients (name, societe_id) VALUES ('Criteo', v_societe_id) RETURNING id INTO v_client2_id;
    INSERT INTO clients (name, societe_id) VALUES ('Deezer', v_societe_id) RETURNING id INTO v_client3_id;
    INSERT INTO clients (name, societe_id) VALUES ('Ledger (crypto)', v_societe_id) RETURNING id INTO v_client4_id;

    INSERT INTO transactions (name, client_id, societe_id, montant, phase, date_fermeture_prevue, notes) VALUES
      ('Branding & UX — Station F',          v_client1_id, v_societe_id,  82000, 'ferme',          '2026-04-01', 'Retainer annuel'),
      ('Design system — Criteo',             v_client2_id, v_societe_id, 165000, 'ferme_a_gagner', '2026-07-31', 'Workshops en cours'),
      ('Expérience utilisateur — Deezer',    v_client3_id, v_societe_id, 130000, 'short_list',     '2026-06-30', 'Compétition créative'),
      ('Identity & Packaging — Ledger',      v_client4_id, v_societe_id,  95000, 'qualification',  '2026-10-31', 'Brief reçu'),
      ('Motion design — Criteo',             v_client2_id, v_societe_id,  48000, 'perdu',          '2025-11-30', 'Freelance retenu');

    INSERT INTO projets (name, client_id, total_jours, statut) VALUES
      ('Branding Station F',     v_client1_id,  75, 'actif'),
      ('Design system Criteo',   v_client2_id, 140, 'actif'),
      ('UX Deezer',              v_client3_id, 110, 'suspendu');

  END IF;

END $$;
