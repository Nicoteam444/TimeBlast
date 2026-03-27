-- Migration : Ajout colonnes lucca_id pour la synchronisation SIRH Lucca
-- À exécuter dans le SQL Editor de Supabase

-- Colonne lucca_id sur equipe (collaborateurs)
ALTER TABLE equipe ADD COLUMN IF NOT EXISTS lucca_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_equipe_lucca_id ON equipe(lucca_id);

-- Colonne lucca_id sur absences
ALTER TABLE absences ADD COLUMN IF NOT EXISTS lucca_id text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_absences_lucca_id ON absences(lucca_id);

-- Colonne lucca_id + lucca_owner_id sur absences
ALTER TABLE absences ADD COLUMN IF NOT EXISTS lucca_owner_id text;

-- Colonne lucca_id sur saisies_temps
ALTER TABLE saisies_temps ADD COLUMN IF NOT EXISTS lucca_id text UNIQUE;
ALTER TABLE saisies_temps ADD COLUMN IF NOT EXISTS lucca_owner_id text;
CREATE INDEX IF NOT EXISTS idx_saisies_temps_lucca_id ON saisies_temps(lucca_id);

-- Colonne lucca_id sur notes_de_frais
ALTER TABLE notes_de_frais ADD COLUMN IF NOT EXISTS lucca_id text UNIQUE;
ALTER TABLE notes_de_frais ADD COLUMN IF NOT EXISTS lucca_owner_id text;
CREATE INDEX IF NOT EXISTS idx_notes_de_frais_lucca_id ON notes_de_frais(lucca_id);
