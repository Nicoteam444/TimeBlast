-- ============================================================
-- WEBMEDIA — Enregistrement de l'environnement dans la base MASTER
-- A executer dans la base Supabase PRINCIPALE (SRA), PAS dans celle de Webmedia
-- ============================================================

-- ATTENTION : remplace <URL_NOUVEAU_PROJET_WEBMEDIA> par la vraie URL du projet Supabase Webmedia
-- (visible dans le dashboard Supabase : Settings > API > Project URL)

INSERT INTO environments (env_code, name, description, supabase_url, is_production, is_active)
VALUES (
  '2026001',
  'Webmedia',
  'Plateforme de gestion de leads — agence Webmedia',
  '<URL_NOUVEAU_PROJET_WEBMEDIA>',
  true,
  true
)
ON CONFLICT (env_code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  supabase_url = EXCLUDED.supabase_url,
  is_active = EXCLUDED.is_active;

-- Lier l'utilisateur super-admin (toi) a ce nouvel environnement
-- Remplace <TON_USER_ID> par ton UUID utilisateur (visible dans auth.users)
-- Tu peux aussi le recuperer avec : SELECT id FROM auth.users WHERE email = 'nicolas.nabhan@groupe-sra.fr';

INSERT INTO user_environments (user_id, environment_id, role)
SELECT
  (SELECT id FROM auth.users WHERE email = 'nicolas.nabhan@groupe-sra.fr'),
  (SELECT id FROM environments WHERE env_code = '2026001'),
  'admin'
ON CONFLICT (user_id, environment_id) DO UPDATE SET role = EXCLUDED.role;
