-- Migration : Enrichir la table equipe pour stocker toutes les données Lucca
-- À exécuter dans le SQL Editor de Supabase

-- Colonnes manquantes pour le mapping Lucca
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS login text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_department_id integer;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_department_name text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_legal_entity_id integer;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_legal_entity_name text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_manager_id integer;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_manager_name text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_role text;
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS date_fin_contrat date;

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_equipe_email ON equipe(email);
CREATE INDEX IF NOT EXISTS idx_equipe_lucca_department ON equipe(lucca_department_id);
CREATE INDEX IF NOT EXISTS idx_equipe_lucca_legal_entity ON equipe(lucca_legal_entity_id);
