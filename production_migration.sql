-- ============================================
-- TIMEBLAST PRODUCTION — Migration complete
-- A executer dans le NOUVEAU projet Supabase
-- ============================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Table groupes
CREATE TABLE IF NOT EXISTS groupes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#2B4C7E'
);

-- 3. Table societes
CREATE TABLE IF NOT EXISTS societes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  siren text,
  groupe_id uuid REFERENCES groupes(id),
  ville text,
  code_postal text,
  pays text DEFAULT 'France',
  adresse text,
  telephone text,
  email text,
  site_web text,
  forme_juridique text,
  capital text,
  rcs text,
  tva_intracommunautaire text,
  code_ape text,
  date_creation date,
  dirigeant text,
  effectif integer,
  logo_url text,
  couleur_primaire text,
  actif boolean DEFAULT true
);

-- 4. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'collaborateur',
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  groupe_id uuid REFERENCES groupes(id),
  appearance_settings jsonb,
  actif boolean DEFAULT true,
  date_embauche date,
  poste text,
  departement text,
  telephone text
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- 5. Trigger auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_societe_id uuid;
BEGIN
  -- Affecter automatiquement a SRA INFORMATIQUE
  SELECT id INTO v_societe_id FROM public.societes WHERE name ILIKE '%SRA%' LIMIT 1;

  INSERT INTO public.profiles (id, full_name, role, societe_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    'collaborateur',
    v_societe_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Tables metier
CREATE TABLE IF NOT EXISTS equipe (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  prenom text, nom text, poste text, departement text,
  date_naissance date, date_embauche date, type_contrat text,
  manager_id uuid, telephone text, adresse text,
  photo_url text, statut text DEFAULT 'actif'
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL, prenom text, email text, telephone text,
  poste text, statut text DEFAULT 'actif', notes text
);

CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  name text NOT NULL, email text, telephone text,
  adresse text, ville text, code_postal text,
  siren text, contact_principal text, notes text
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  titre text, nom text, prenom text, email text,
  telephone text, entreprise text, source text,
  phase text DEFAULT 'nouveau', montant numeric(15,2),
  date_relance date, notes text, owner_id uuid
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  name text, client_id uuid REFERENCES clients(id),
  phase text DEFAULT 'qualification', montant numeric(15,2),
  date_fermeture date, notes text, owner_id uuid
);

CREATE TABLE IF NOT EXISTS projets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES clients(id),
  name text NOT NULL, total_jours numeric(10,2),
  date_debut date, date_fin date,
  statut text DEFAULT 'actif',
  created_at timestamptz DEFAULT now(),
  hubspot_deal_id text, societe_id uuid REFERENCES societes(id)
);

CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  name text NOT NULL, "order" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kanban_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  column_id uuid REFERENCES kanban_columns(id),
  title text NOT NULL, assigned_to uuid,
  priority text DEFAULT 'moyenne',
  estimated_hours numeric(5,2), due_date date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projet_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, role text DEFAULT 'membre',
  created_at timestamptz DEFAULT now(),
  UNIQUE(projet_id, user_id)
);

CREATE TABLE IF NOT EXISTS saisies_temps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id),
  societe_id uuid REFERENCES societes(id),
  projet_id uuid REFERENCES projets(id),
  date date NOT NULL, duree numeric(5,2),
  description text, facturable boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS absences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id),
  societe_id uuid REFERENCES societes(id),
  type text, date_debut date, date_fin date,
  statut text DEFAULT 'en_attente', motif text
);

CREATE TABLE IF NOT EXISTS notes_de_frais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id),
  societe_id uuid REFERENCES societes(id),
  description text, montant numeric(15,2),
  date date, statut text DEFAULT 'en_attente',
  categorie text, justificatif_url text
);

CREATE TABLE IF NOT EXISTS documents_archive (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  nom text NOT NULL, type_document text DEFAULT 'autre',
  fournisseur text, reference text, numero_commande text,
  date_document date, date_echeance date,
  montant_ht numeric(15,2), montant_tva numeric(15,2), montant_ttc numeric(15,2),
  nb_pages integer DEFAULT 1, fichier_url text, fichier_nom text,
  fichier_taille bigint DEFAULT 0, ocr_contenu text,
  ocr_status text DEFAULT 'en_attente', tags text[],
  uploaded_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  user_id uuid REFERENCES profiles(id),
  title text NOT NULL, description text,
  start_time timestamptz NOT NULL, end_time timestamptz NOT NULL,
  event_type text DEFAULT 'meeting', location text,
  color text, all_day boolean DEFAULT false,
  is_time_entry boolean DEFAULT false,
  projet_id uuid REFERENCES projets(id),
  duree_heures numeric(5,2), facturable boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS automation_workflows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  name text NOT NULL, description text,
  trigger_type text, trigger_config jsonb DEFAULT '{}',
  actions jsonb DEFAULT '[]',
  is_active boolean DEFAULT false,
  last_run timestamptz, run_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  societe_id uuid REFERENCES societes(id),
  user_id uuid REFERENCES profiles(id),
  entity_type text, entity_id uuid, entity_name text,
  action text, details text
);

CREATE TABLE IF NOT EXISTS page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id),
  page_path text NOT NULL, page_title text, session_id text
);

CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  route_path text NOT NULL, created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, route_path)
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  name text NOT NULL, email text NOT NULL,
  company text, message text NOT NULL,
  read boolean DEFAULT false, replied boolean DEFAULT false, notes text
);

CREATE TABLE IF NOT EXISTS competences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  nom text NOT NULL, categorie text, description text
);

CREATE TABLE IF NOT EXISTS competence_evaluations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  collaborateur_id uuid, competence_id uuid REFERENCES competences(id),
  niveau integer DEFAULT 0, evaluateur_id uuid, commentaire text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL, module text NOT NULL, sub_module text NOT NULL,
  can_view boolean DEFAULT false, can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false, can_delete boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id),
  UNIQUE(role, module, sub_module)
);

-- 7. RLS sur toutes les tables
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE saisies_temps ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_de_frais ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE competences ENABLE ROW LEVEL SECURITY;
ALTER TABLE competence_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupes ENABLE ROW LEVEL SECURITY;
ALTER TABLE societes ENABLE ROW LEVEL SECURITY;

-- 8. Policies permissives pour utilisateurs authentifies
CREATE POLICY "auth_read" ON equipe FOR SELECT USING (true);
CREATE POLICY "auth_write" ON equipe FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON contacts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON clients FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON leads FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON transactions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON projets FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON kanban_columns FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON kanban_tasks FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON projet_members FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON saisies_temps FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON absences FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON notes_de_frais FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON documents_archive FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON calendar_events FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON automation_workflows FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON activity_log FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_insert" ON page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_read" ON page_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "auth_all" ON user_favorites FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "auth_read" ON contact_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "auth_insert" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "auth_all" ON competences FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON competence_evaluations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_read" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "auth_write" ON role_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'nicolas.nabhan@groupe-sra.fr')
);
CREATE POLICY "auth_all" ON groupes FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth_all" ON societes FOR ALL USING (auth.uid() IS NOT NULL);

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_societe ON profiles(societe_id);
CREATE INDEX IF NOT EXISTS idx_equipe_societe ON equipe(societe_id);
CREATE INDEX IF NOT EXISTS idx_contacts_societe ON contacts(societe_id);
CREATE INDEX IF NOT EXISTS idx_clients_societe ON clients(societe_id);
CREATE INDEX IF NOT EXISTS idx_leads_societe ON leads(societe_id);
CREATE INDEX IF NOT EXISTS idx_projets_societe ON projets(societe_id);
CREATE INDEX IF NOT EXISTS idx_saisies_user ON saisies_temps(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_societe ON activity_log(societe_id);

-- 10. Fonction get_users_with_auth (pour admin)
CREATE OR REPLACE FUNCTION get_users_with_auth()
RETURNS TABLE (
  id uuid, full_name text, role text, created_at timestamptz,
  email text, last_sign_in_at timestamptz, email_confirmed_at timestamptz,
  invited_at timestamptz, actif boolean, societe_id uuid,
  poste text, telephone text, departement text, date_embauche date
) AS $$
  SELECT p.id, p.full_name, p.role, p.created_at, u.email,
    u.last_sign_in_at, u.email_confirmed_at, u.invited_at,
    COALESCE(p.actif, true), p.societe_id, p.poste, p.telephone,
    p.departement, p.date_embauche
  FROM public.profiles p JOIN auth.users u ON p.id = u.id
  ORDER BY p.full_name;
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. Inserer la societe SRA INFORMATIQUE
INSERT INTO societes (name, siren, pays, actif)
VALUES ('SRA INFORMATIQUE', '000000000', 'France', true)
ON CONFLICT DO NOTHING;

-- DONE!
SELECT 'Migration production terminee avec succes!' as status;
