-- ══════════════════════════════════════════════════════════════════
-- NETTOYAGE + 3 projets complets et crédibles dans SRA TEST
-- Exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── ÉTAPE 1 : Supprimer TOUS les projets de SRA TEST ────────────

-- D'abord les time entries liées aux tâches des projets SRA TEST
DELETE FROM kanban_time_entries WHERE task_id IN (
  SELECT kt.id FROM kanban_tasks kt
  JOIN projets p ON kt.projet_id = p.id
  WHERE p.societe_id = '22222222-0016-0000-0000-000000000000'
);

-- Tâches kanban
DELETE FROM kanban_tasks WHERE projet_id IN (
  SELECT id FROM projets WHERE societe_id = '22222222-0016-0000-0000-000000000000'
);

-- Colonnes kanban
DELETE FROM kanban_columns WHERE projet_id IN (
  SELECT id FROM projets WHERE societe_id = '22222222-0016-0000-0000-000000000000'
);

-- Membres projet
DELETE FROM projet_members WHERE projet_id IN (
  SELECT id FROM projets WHERE societe_id = '22222222-0016-0000-0000-000000000000'
);

-- Lots et assignations (ancien système)
DELETE FROM assignations WHERE lot_id IN (
  SELECT l.id FROM lots l JOIN projets p ON l.projet_id = p.id
  WHERE p.societe_id = '22222222-0016-0000-0000-000000000000'
);
DELETE FROM lots WHERE projet_id IN (
  SELECT id FROM projets WHERE societe_id = '22222222-0016-0000-0000-000000000000'
);

-- Enfin les projets eux-mêmes
DELETE FROM projets WHERE societe_id = '22222222-0016-0000-0000-000000000000';

-- ══════════════════════════════════════════════════════════════════
-- ── ÉTAPE 2 : Créer 3 projets crédibles ─────────────────────────
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_nicolas uuid;
  v_collab uuid;
  v_societe_id uuid := '22222222-0016-0000-0000-000000000000';
  -- Projets
  v_p1 uuid := gen_random_uuid();
  v_p2 uuid := gen_random_uuid();
  v_p3 uuid := gen_random_uuid();
  -- Colonnes P1
  v_p1_c1 uuid := gen_random_uuid();
  v_p1_c2 uuid := gen_random_uuid();
  v_p1_c3 uuid := gen_random_uuid();
  v_p1_c4 uuid := gen_random_uuid();
  -- Colonnes P2
  v_p2_c1 uuid := gen_random_uuid();
  v_p2_c2 uuid := gen_random_uuid();
  v_p2_c3 uuid := gen_random_uuid();
  v_p2_c4 uuid := gen_random_uuid();
  -- Colonnes P3
  v_p3_c1 uuid := gen_random_uuid();
  v_p3_c2 uuid := gen_random_uuid();
  v_p3_c3 uuid := gen_random_uuid();
  v_p3_c4 uuid := gen_random_uuid();
  -- Tâches (pour le time logging)
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_t5 uuid;
  v_t6 uuid; v_t7 uuid; v_t8 uuid; v_t9 uuid; v_t10 uuid;
BEGIN
  -- Récupérer les users
  SELECT id INTO v_nicolas FROM profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1;
  SELECT id INTO v_collab FROM profiles WHERE role IN ('manager', 'collaborateur') AND id != v_nicolas ORDER BY created_at LIMIT 1;
  IF v_collab IS NULL THEN v_collab := v_nicolas; END IF;

  -- ════════════════════════════════════════════════════════════════
  -- PROJET 1 : Migration ERP Sage → TimeBlast
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO projets (id, name, total_jours, date_debut, date_fin, statut, societe_id)
  VALUES (v_p1, 'Migration ERP Sage → TimeBlast', 30, '2026-02-01', '2026-05-31', 'actif', v_societe_id);

  -- Colonnes
  INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES
    (v_p1_c1, v_p1, 'À faire', 0),
    (v_p1_c2, v_p1, 'En cours', 1),
    (v_p1_c3, v_p1, 'À valider', 2),
    (v_p1_c4, v_p1, 'Terminé', 3);

  -- Membres
  INSERT INTO projet_members (projet_id, user_id) VALUES (v_p1, v_nicolas);
  IF v_collab != v_nicolas THEN
    INSERT INTO projet_members (projet_id, user_id) VALUES (v_p1, v_collab);
  END IF;

  -- Tâches "À faire"
  v_t1 := gen_random_uuid();
  v_t2 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t1, v_p1, v_p1_c1, 'Mapper les comptes comptables Sage vers plan TimeBlast', v_nicolas, 'haute', 8, '2026-04-15'),
    (v_t2, v_p1, v_p1_c1, 'Importer les écritures N-1 (exercice 2025)', v_collab, 'moyenne', 6, '2026-04-20'),
    (gen_random_uuid(), v_p1, v_p1_c1, 'Paramétrer les journaux comptables', v_nicolas, 'basse', 3, '2026-04-25');

  -- Tâches "En cours"
  v_t3 := gen_random_uuid();
  v_t4 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t3, v_p1, v_p1_c2, 'Export FEC depuis Sage (3 derniers exercices)', v_nicolas, 'haute', 4, '2026-03-28'),
    (v_t4, v_p1, v_p1_c2, 'Configurer les connecteurs bancaires (BNP, SG)', v_collab, 'haute', 10, '2026-04-01');

  -- Tâches "À valider"
  v_t5 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t5, v_p1, v_p1_c3, 'Vérifier la balance des comptes après import', v_nicolas, 'haute', 4, '2026-03-25');

  -- Tâches "Terminé"
  v_t6 := gen_random_uuid();
  v_t7 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t6, v_p1, v_p1_c4, 'Créer le plan comptable dans TimeBlast', v_nicolas, 'haute', 3, '2026-03-10'),
    (v_t7, v_p1, v_p1_c4, 'Former l''équipe compta à l''interface', v_collab, 'moyenne', 8, '2026-03-18');

  -- Time entries P1
  INSERT INTO kanban_time_entries (task_id, user_id, hours, date, note) VALUES
    (v_t3, v_nicolas, 2, '2026-03-20', 'Export FEC 2023 OK'),
    (v_t3, v_nicolas, 1.5, '2026-03-21', 'Export FEC 2024 + vérification'),
    (v_t4, v_collab, 3, '2026-03-22', 'Config connecteur BNP Paribas'),
    (v_t4, v_collab, 2, '2026-03-23', 'Config connecteur Société Générale - en attente API'),
    (v_t5, v_nicolas, 3, '2026-03-24', 'Balance vérifiée - écart 0.02€ à investiguer'),
    (v_t6, v_nicolas, 3, '2026-03-08', 'Plan comptable créé avec 340 comptes'),
    (v_t7, v_collab, 4, '2026-03-15', 'Formation matin - navigation + saisie'),
    (v_t7, v_collab, 4, '2026-03-16', 'Formation après-midi - reporting + exports');

  -- ════════════════════════════════════════════════════════════════
  -- PROJET 2 : Déploiement CRM commercial
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO projets (id, name, total_jours, date_debut, date_fin, statut, societe_id)
  VALUES (v_p2, 'Déploiement CRM commercial', 20, '2026-03-01', '2026-04-30', 'actif', v_societe_id);

  INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES
    (v_p2_c1, v_p2, 'À faire', 0),
    (v_p2_c2, v_p2, 'En cours', 1),
    (v_p2_c3, v_p2, 'À tester', 2),
    (v_p2_c4, v_p2, 'Terminé', 3);

  INSERT INTO projet_members (projet_id, user_id) VALUES (v_p2, v_nicolas);
  IF v_collab != v_nicolas THEN
    INSERT INTO projet_members (projet_id, user_id) VALUES (v_p2, v_collab);
  END IF;

  -- Tâches
  v_t1 := gen_random_uuid();
  v_t2 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t1, v_p2, v_p2_c1, 'Définir les étapes du pipeline commercial', v_nicolas, 'haute', 3, '2026-04-05'),
    (gen_random_uuid(), v_p2, v_p2_c1, 'Importer la base prospects depuis Excel', v_collab, 'moyenne', 4, '2026-04-10');

  v_t3 := gen_random_uuid();
  v_t4 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t3, v_p2, v_p2_c2, 'Configurer les champs personnalisés entreprises', v_nicolas, 'moyenne', 5, '2026-03-30'),
    (v_t4, v_p2, v_p2_c2, 'Créer les templates d''emails de relance', v_collab, 'basse', 6, '2026-04-02');

  v_t5 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t5, v_p2, v_p2_c3, 'Tester le workflow Lead → Client', v_nicolas, 'haute', 3, '2026-03-26');

  v_t6 := gen_random_uuid();
  v_t7 := gen_random_uuid();
  v_t8 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t6, v_p2, v_p2_c4, 'Importer 250 contacts depuis HubSpot', v_collab, 'haute', 4, '2026-03-15'),
    (v_t7, v_p2, v_p2_c4, 'Créer les fiches des 12 commerciaux', v_nicolas, 'moyenne', 2, '2026-03-12'),
    (v_t8, v_p2, v_p2_c4, 'Paramétrer les droits d''accès par équipe', v_nicolas, 'haute', 3, '2026-03-14');

  -- Time entries P2
  INSERT INTO kanban_time_entries (task_id, user_id, hours, date, note) VALUES
    (v_t3, v_nicolas, 2.5, '2026-03-22', 'Champs SIRET, secteur, CA estimé'),
    (v_t3, v_nicolas, 1.5, '2026-03-23', 'Champs contact principal + tel direct'),
    (v_t4, v_collab, 2, '2026-03-23', 'Template relance J+7 et J+30'),
    (v_t5, v_nicolas, 2, '2026-03-24', 'Test OK mais notification manquante'),
    (v_t6, v_collab, 3.5, '2026-03-14', 'Import CSV HubSpot - 248/250 OK'),
    (v_t7, v_nicolas, 1.5, '2026-03-11', 'Fiches créées avec rôles'),
    (v_t8, v_nicolas, 2.5, '2026-03-13', 'Droits admin/manager/commercial configurés');

  -- ════════════════════════════════════════════════════════════════
  -- PROJET 3 : Conformité e-facture 2026
  -- ════════════════════════════════════════════════════════════════
  INSERT INTO projets (id, name, total_jours, date_debut, date_fin, statut, societe_id)
  VALUES (v_p3, 'Conformité e-facture 2026', 15, '2026-03-15', '2026-06-30', 'actif', v_societe_id);

  INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES
    (v_p3_c1, v_p3, 'À planifier', 0),
    (v_p3_c2, v_p3, 'En cours', 1),
    (v_p3_c3, v_p3, 'En attente validation', 2),
    (v_p3_c4, v_p3, 'Conforme', 3);

  INSERT INTO projet_members (projet_id, user_id) VALUES (v_p3, v_nicolas);
  IF v_collab != v_nicolas THEN
    INSERT INTO projet_members (projet_id, user_id) VALUES (v_p3, v_collab);
  END IF;

  -- Tâches
  v_t1 := gen_random_uuid();
  v_t2 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t1, v_p3, v_p3_c1, 'Choisir la PDP (Plateforme de Dématérialisation)', v_nicolas, 'haute', 8, '2026-04-30'),
    (v_t2, v_p3, v_p3_c1, 'Vérifier la conformité des mentions légales factures', v_collab, 'moyenne', 3, '2026-04-15');

  v_t3 := gen_random_uuid();
  v_t4 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t3, v_p3, v_p3_c2, 'Configurer l''export XML UBL dans TimeBlast', v_nicolas, 'haute', 6, '2026-04-01'),
    (v_t4, v_p3, v_p3_c2, 'Tester l''envoi vers le portail Chorus Pro (sandbox)', v_nicolas, 'haute', 4, '2026-04-10');

  v_t5 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t5, v_p3, v_p3_c3, 'Faire valider le format par l''expert-comptable', v_collab, 'haute', 2, '2026-03-28');

  v_t6 := gen_random_uuid();
  v_t7 := gen_random_uuid();
  INSERT INTO kanban_tasks (id, projet_id, column_id, title, assigned_to, priority, estimated_hours, due_date) VALUES
    (v_t6, v_p3, v_p3_c4, 'Audit des factures existantes (format actuel)', v_collab, 'moyenne', 4, '2026-03-20'),
    (v_t7, v_p3, v_p3_c4, 'Documenter le processus de facturation cible', v_nicolas, 'basse', 3, '2026-03-22');

  -- Time entries P3
  INSERT INTO kanban_time_entries (task_id, user_id, hours, date, note) VALUES
    (v_t3, v_nicolas, 2, '2026-03-24', 'Config XML UBL - structure de base OK'),
    (v_t4, v_nicolas, 1, '2026-03-24', 'Compte sandbox Chorus Pro créé'),
    (v_t5, v_collab, 1.5, '2026-03-25', 'RDV cabinet comptable - retours à intégrer'),
    (v_t6, v_collab, 3, '2026-03-19', 'Audit 150 factures - 12 non conformes identifiées'),
    (v_t7, v_nicolas, 2.5, '2026-03-21', 'Process documenté avec schéma de flux');

END $$;
