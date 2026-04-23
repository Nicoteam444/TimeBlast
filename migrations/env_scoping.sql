-- ============================================================
-- ISOLATION PAR ENVIRONMENT — SRA / Webmedia hermetique
-- ============================================================
-- Ajoute environment_id a toutes les tables metier + backfill
-- toutes les donnees existantes vers l'env SRA (Groupe SRA).
-- Un filtrage par env_id sera applique cote client.
-- ============================================================

-- IDs des environnements
-- SRA:      4657c018-d993-4876-8a10-df9da89d5612
-- Webmedia: 4a70b987-9541-4db9-8f1b-144a74682c30

-- Tables metier a scoper (tout sauf tables globales, auth, profiles, wm_*, si_*)
DO $$
DECLARE
  t TEXT;
  sra_env_id UUID := '4657c018-d993-4876-8a10-df9da89d5612';
  scoped_tables TEXT[] := ARRAY[
    'abonnements','absences','achats','assignations','automation_workflows',
    'calendar_events','campagnes','client_projects','clients',
    'competence_evaluations','competences','contacts',
    'devis','documents_archive','ecritures_comptables',
    'equipe','factures','fec_ecritures','fec_imports',
    'immobilisations','integrations','journal_entries','journal_lines',
    'kanban_columns','kanban_tasks','kanban_time_entries','leads','lots',
    'notes_de_frais','org_edges','org_nodes',
    'plannings','produits','project_messages','projet_members','projets',
    'saisies_temps','societes','stocks','time_entries',
    'transactions','validation_semaines','wiki_articles'
  ];
BEGIN
  FOREACH t IN ARRAY scoped_tables
  LOOP
    -- 1. Ajouter la colonne environment_id si elle n'existe pas
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS environment_id UUID REFERENCES environments(id)',
      t
    );

    -- 2. Backfill : toute donnee existante -> SRA
    EXECUTE format(
      'UPDATE %I SET environment_id = %L WHERE environment_id IS NULL',
      t, sra_env_id
    );

    -- 3. Index pour les queries filtrees
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I(environment_id)',
      'idx_' || t || '_env', t
    );

    RAISE NOTICE 'Scoped table: %', t;
  END LOOP;
END $$;

-- Verification : compter par env pour chaque table
SELECT 'equipe' AS table_name,
  (SELECT COUNT(*) FROM equipe WHERE environment_id = '4657c018-d993-4876-8a10-df9da89d5612') AS sra,
  (SELECT COUNT(*) FROM equipe WHERE environment_id = '4a70b987-9541-4db9-8f1b-144a74682c30') AS webmedia,
  (SELECT COUNT(*) FROM equipe WHERE environment_id IS NULL) AS orphan
UNION ALL SELECT 'integrations',
  (SELECT COUNT(*) FROM integrations WHERE environment_id = '4657c018-d993-4876-8a10-df9da89d5612'),
  (SELECT COUNT(*) FROM integrations WHERE environment_id = '4a70b987-9541-4db9-8f1b-144a74682c30'),
  (SELECT COUNT(*) FROM integrations WHERE environment_id IS NULL)
UNION ALL SELECT 'clients',
  (SELECT COUNT(*) FROM clients WHERE environment_id = '4657c018-d993-4876-8a10-df9da89d5612'),
  (SELECT COUNT(*) FROM clients WHERE environment_id = '4a70b987-9541-4db9-8f1b-144a74682c30'),
  (SELECT COUNT(*) FROM clients WHERE environment_id IS NULL)
UNION ALL SELECT 'projets',
  (SELECT COUNT(*) FROM projets WHERE environment_id = '4657c018-d993-4876-8a10-df9da89d5612'),
  (SELECT COUNT(*) FROM projets WHERE environment_id = '4a70b987-9541-4db9-8f1b-144a74682c30'),
  (SELECT COUNT(*) FROM projets WHERE environment_id IS NULL);
