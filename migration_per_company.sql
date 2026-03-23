-- ① saisies_temps : ajoute societe_id
ALTER TABLE saisies_temps ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);
CREATE INDEX IF NOT EXISTS idx_saisies_societe ON saisies_temps(societe_id);

-- ② plannings : crée la table (remplace les données en mémoire)
CREATE TABLE IF NOT EXISTS plannings (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  societe_id  uuid REFERENCES societes(id),
  user_key    text NOT NULL,
  user_label  text NOT NULL,
  label       text NOT NULL,
  color       text DEFAULT '#6366f1',
  date_debut  date NOT NULL,
  date_fin    date NOT NULL,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plannings_all" ON plannings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','collaborateur','comptable')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','manager','collaborateur','comptable')));
CREATE INDEX IF NOT EXISTS idx_plannings_societe ON plannings(societe_id);

-- ③ fec_imports : ajoute societe_id
ALTER TABLE fec_imports ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);
