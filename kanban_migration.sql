-- ══════════════════════════════════════════════════════════════════
-- Migration Kanban complète : colonnes, tâches, membres, temps
-- Exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- Table des colonnes Kanban par projet
CREATE TABLE IF NOT EXISTS kanban_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  name text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kanban_columns_all" ON kanban_columns;
CREATE POLICY "kanban_columns_all" ON kanban_columns FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager','collaborateur')));

CREATE INDEX IF NOT EXISTS idx_kanban_columns_projet ON kanban_columns(projet_id);

-- Table des tâches Kanban
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES kanban_columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to uuid REFERENCES profiles(id) ON DELETE SET NULL,
  priority text DEFAULT 'moyenne' CHECK (priority IN ('haute', 'moyenne', 'basse')),
  estimated_hours numeric(10,2) DEFAULT 0,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kanban_tasks_all" ON kanban_tasks;
CREATE POLICY "kanban_tasks_all" ON kanban_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager','collaborateur')));

CREATE INDEX IF NOT EXISTS idx_kanban_tasks_projet ON kanban_tasks(projet_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_column ON kanban_tasks(column_id);

-- Table des temps passés par tâche
CREATE TABLE IF NOT EXISTS kanban_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours numeric(10,2) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kanban_time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kanban_time_entries_all" ON kanban_time_entries;
CREATE POLICY "kanban_time_entries_all" ON kanban_time_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager','collaborateur')));

CREATE INDEX IF NOT EXISTS idx_kanban_time_task ON kanban_time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_kanban_time_user ON kanban_time_entries(user_id);

-- Table des membres de projet
CREATE TABLE IF NOT EXISTS projet_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(projet_id, user_id)
);

ALTER TABLE projet_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projet_members_all" ON projet_members;
CREATE POLICY "projet_members_all" ON projet_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager','collaborateur')));

CREATE INDEX IF NOT EXISTS idx_projet_members_projet ON projet_members(projet_id);
