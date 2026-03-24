-- ══════════════════════════════════════════════════════════════════
-- DONNÉES TEST Sandbox
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_soc_id uuid := 'e76fc18d-72f3-4953-ac41-8dd44e69458f';
  v_proj1 uuid; v_proj2 uuid; v_proj3 uuid;
  v_col1_1 uuid; v_col1_2 uuid; v_col1_3 uuid; v_col1_4 uuid;
  v_col2_1 uuid; v_col2_2 uuid; v_col2_3 uuid; v_col2_4 uuid;
  v_col3_1 uuid; v_col3_2 uuid; v_col3_3 uuid; v_col3_4 uuid;
BEGIN

-- 1. PROJETS
INSERT INTO projets (id, name, statut, societe_id, total_jours, date_debut, date_fin, created_at) VALUES
  (gen_random_uuid(), 'Migration ERP SAP', 'actif', v_soc_id, 500, '2025-09-15', '2026-06-30', '2025-09-15') RETURNING id INTO v_proj1;
INSERT INTO projets (id, name, statut, societe_id, total_jours, date_debut, date_fin, created_at) VALUES
  (gen_random_uuid(), 'Refonte Site Corporate', 'actif', v_soc_id, 200, '2025-11-01', '2026-04-30', '2025-11-01') RETURNING id INTO v_proj2;
INSERT INTO projets (id, name, statut, societe_id, total_jours, date_debut, date_fin, created_at) VALUES
  (gen_random_uuid(), 'Audit Cybersécurité', 'actif', v_soc_id, 120, '2026-01-10', '2026-05-15', '2026-01-10') RETURNING id INTO v_proj3;

-- 2. COLONNES KANBAN
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj1, 'À faire', 0) RETURNING id INTO v_col1_1;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj1, 'En cours', 1) RETURNING id INTO v_col1_2;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj1, 'À tester', 2) RETURNING id INTO v_col1_3;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj1, 'Terminé', 3) RETURNING id INTO v_col1_4;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj2, 'À faire', 0) RETURNING id INTO v_col2_1;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj2, 'En cours', 1) RETURNING id INTO v_col2_2;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj2, 'À tester', 2) RETURNING id INTO v_col2_3;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj2, 'Terminé', 3) RETURNING id INTO v_col2_4;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj3, 'À faire', 0) RETURNING id INTO v_col3_1;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj3, 'En cours', 1) RETURNING id INTO v_col3_2;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj3, 'À tester', 2) RETURNING id INTO v_col3_3;
INSERT INTO kanban_columns (id, projet_id, name, "order") VALUES (gen_random_uuid(), v_proj3, 'Terminé', 3) RETURNING id INTO v_col3_4;

-- 3. TÂCHES KANBAN
-- Projet 1
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj1, v_col1_1, 'Migrer module comptabilité', 'haute', 40, '2026-04-15'),
  (v_proj1, v_col1_1, 'Formation utilisateurs RH', 'moyenne', 16, '2026-04-20'),
  (v_proj1, v_col1_1, 'Configurer SSO Azure AD', 'haute', 24, '2026-03-30');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj1, v_col1_2, 'Import données clients SAP', 'haute', 32, '2026-03-28'),
  (v_proj1, v_col1_2, 'Paramétrage plan comptable', 'haute', 20, '2026-03-25'),
  (v_proj1, v_col1_2, 'Tests de charge API', 'moyenne', 16, '2026-03-29');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj1, v_col1_3, 'Module facturation configuré', 'haute', 24, '2026-03-24'),
  (v_proj1, v_col1_3, 'Import contacts CRM', 'moyenne', 12, '2026-03-24');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj1, v_col1_4, 'Audit données SAP existantes', 'haute', 40, '2026-02-15'),
  (v_proj1, v_col1_4, 'Création environnement de test', 'moyenne', 16, '2026-02-20'),
  (v_proj1, v_col1_4, 'Mapping champs SAP', 'haute', 32, '2026-03-01'),
  (v_proj1, v_col1_4, 'Cahier de recette validé', 'basse', 24, '2026-03-05');
-- Projet 2
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj2, v_col2_1, 'Optimisation SEO technique', 'haute', 16, '2026-04-10'),
  (v_proj2, v_col2_1, 'Intégration Google Analytics 4', 'moyenne', 8, '2026-04-05');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj2, v_col2_2, 'Page Nos métiers', 'haute', 24, '2026-03-28'),
  (v_proj2, v_col2_2, 'Design responsive mobile', 'haute', 32, '2026-03-30');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj2, v_col2_3, 'Page Accueil intégrée', 'haute', 16, '2026-03-24'),
  (v_proj2, v_col2_3, 'Page Contact avec Maps', 'moyenne', 12, '2026-03-24');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj2, v_col2_4, 'Maquettes Figma validées', 'haute', 40, '2026-01-30'),
  (v_proj2, v_col2_4, 'Charte graphique finalisée', 'moyenne', 24, '2026-02-10');
-- Projet 3
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj3, v_col3_1, 'Revue conformité RGPD', 'haute', 24, '2026-04-15'),
  (v_proj3, v_col3_1, 'Plan de remédiation', 'haute', 16, '2026-04-20');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj3, v_col3_2, 'Tests d''intrusion externes', 'haute', 40, '2026-03-30'),
  (v_proj3, v_col3_2, 'Revue accès Active Directory', 'haute', 24, '2026-03-28');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj3, v_col3_3, 'Scan vulnérabilités réseau', 'haute', 16, '2026-03-24');
INSERT INTO kanban_tasks (projet_id, column_id, title, priority, estimated_hours, due_date) VALUES
  (v_proj3, v_col3_4, 'Inventaire des actifs IT', 'moyenne', 32, '2026-02-28'),
  (v_proj3, v_col3_4, 'Analyse politique mots de passe', 'moyenne', 16, '2026-03-10');

-- 4. CAMPAGNES
INSERT INTO campagnes (societe_id, nom, type, date_debut, date_fin, budget, statut, objectif, leads_generes) VALUES
  (v_soc_id, 'Lancement offre PME 2026', 'email', '2026-02-01', '2026-03-31', 3500, 'en_cours', 'Générer 200 leads qualifiés', 127),
  (v_soc_id, 'Webinaire IA & Gestion', 'event', '2026-04-10', '2026-04-10', 1500, 'brouillon', '500 inscrits, 200 participants', 0),
  (v_soc_id, 'SEO Blog Entreprise', 'seo', '2026-01-01', '2026-06-30', 6000, 'en_cours', '10K visites organiques/mois', 45),
  (v_soc_id, 'LinkedIn Ads DAF/DG', 'ads', '2026-03-01', '2026-05-31', 8000, 'en_cours', '150 MQL, CPL < 50€', 68),
  (v_soc_id, 'Salon Solutions RH', 'event', '2026-03-25', '2026-03-27', 12000, 'en_cours', '300 contacts et 50 RDV', 89);

-- 5. DOCUMENTS
INSERT INTO documents_archive (societe_id, nom, type_document, type_frais, fournisseur, reference, numero_commande, date_document, date_echeance, montant_ht, montant_tva, montant_ttc, nb_pages, ocr_contenu, ocr_status, tags) VALUES
  (v_soc_id, 'Facture OVH Cloud Février', 'facture', 'achat', 'OVH Cloud', 'FR-2026-02-4521', 'CMD-0089', '2026-02-28', '2026-03-30', 2450, 490, 2940, 2, 'OVH SAS - Serveurs 3x MC-64 1200€ - S3 450€ - Bande passante 300€ - Support 500€', 'termine', ARRAY['cloud','mensuel']),
  (v_soc_id, 'Contrat Maintenance Ascenseurs', 'contrat', NULL, 'Schindler', 'CTR-2025-1847', NULL, '2025-12-15', '2026-12-15', 8500, 1700, 10200, 6, 'Maintenance préventive 2 ascenseurs - Visites trimestrielles - Astreinte 24/7', 'termine', ARRAY['maintenance','annuel']),
  (v_soc_id, 'Devis Mobilier Open Space', 'devis', 'achat', 'Steelcase', 'DEV-2026-0312', NULL, '2026-03-10', '2026-04-10', 15600, 3120, 18720, 3, '8x Bureau Ology 9600€ - 8x Fauteuil Gesture 4800€ - 2x Table 1200€', 'termine', ARRAY['mobilier','aménagement']),
  (v_soc_id, 'Facture Free Telecom Mars', 'facture', 'frais_generaux', 'Free Pro', 'FP-2026-03-7845', NULL, '2026-03-01', '2026-03-31', 189, 37.80, 226.80, 1, '12 lignes mobiles 144€ - Fibre Pro 45€', 'termine', ARRAY['telecom','mensuel']),
  (v_soc_id, 'Facture AWS Janvier', 'facture', 'achat', 'AWS', 'INV-2026-01-EU', 'AWS-445521', '2026-01-31', '2026-02-28', 1875.50, 375.10, 2250.60, 2, 'EC2 1200€ - RDS 350€ - S3 125€ - CloudFront 200€', 'termine', ARRAY['cloud','aws','mensuel']),
  (v_soc_id, 'Bon commande Fournitures Q1', 'bon_commande', 'frais_generaux', 'Lyreco', 'BDC-2026-0156', 'CMD-0042', '2026-01-15', NULL, 845, 169, 1014, 1, 'Ramettes x50 250€ - Cartouches HP x20 380€ - Classeurs 115€', 'termine', ARRAY['fournitures','bureau']),
  (v_soc_id, 'Attestation RC Pro 2026', 'courrier', NULL, 'AXA', 'ATT-RC-2026', NULL, '2026-01-02', '2026-12-31', NULL, NULL, NULL, 1, 'RC Professionnelle - Police 7845 - Garantie 2M€/sinistre', 'termine', ARRAY['assurance','annuel']),
  (v_soc_id, 'Facture Expert-Comptable Bilan', 'facture', 'frais_generaux', 'Mazars', 'MAZ-2026-0234', NULL, '2026-03-15', '2026-04-15', 12500, 2500, 15000, 4, 'Bilan 8000€ - Liasses fiscales 2500€ - Conseil 2000€', 'termine', ARRAY['comptabilité','bilan']),
  (v_soc_id, 'Relevé Banque Pop Février', 'releve', NULL, 'Banque Populaire', 'REL-BP-02', NULL, '2026-02-28', NULL, NULL, NULL, NULL, 3, 'Solde début 45678€ - Crédits 89450€ - Débits 72315€ - Solde fin 62812€', 'termine', ARRAY['banque','mensuel']),
  (v_soc_id, 'Contrat CDI Sophie Martin', 'contrat', NULL, 'Sandbox', 'CTR-CDI-008', NULL, '2026-03-01', NULL, NULL, NULL, NULL, 4, 'CDI Chargée communication - Cadre coeff 150 - 3200€ brut', 'termine', ARRAY['rh','cdi']),
  (v_soc_id, 'Facture Google Workspace Mars', 'facture', 'achat', 'Google Cloud', 'GC-2026-03', NULL, '2026-03-01', '2026-03-31', 720, 144, 864, 1, 'Workspace Business Standard - 40 users x 18€', 'termine', ARRAY['saas','mensuel']),
  (v_soc_id, 'Devis Formation Cyber SANS', 'devis', 'frais_generaux', 'SANS Institute', 'QT-2026-1205', NULL, '2026-03-05', '2026-04-05', 4500, 900, 5400, 2, 'Formation SEC504 - 5 jours - Certification GCIH incluse', 'en_attente', ARRAY['formation','cybersécurité']),
  (v_soc_id, 'Facture Nettoyage Février', 'facture', 'frais_generaux', 'Onet', 'ON-2026-02-892', 'CMD-NET', '2026-02-28', '2026-03-15', 1200, 240, 1440, 1, 'Nettoyage bureaux 450m² - 3 passages/semaine', 'termine', ARRAY['nettoyage','mensuel']),
  (v_soc_id, 'Avoir Remise Lyreco', 'avoir', 'frais_generaux', 'Lyreco', 'AV-2026-0078', NULL, '2026-03-01', NULL, -125, -25, -150, 1, 'Remise volume Q4 2025', 'termine', ARRAY['fournitures','avoir']),
  (v_soc_id, 'Facture Sage Paie 2026', 'facture', 'achat', 'Sage', 'SAGE-2026-4412', NULL, '2026-01-05', '2026-02-05', 3600, 720, 4320, 2, 'Sage Paie & RH - 45 bulletins - Support prioritaire', 'termine', ARRAY['logiciel','paie','annuel']);

RAISE NOTICE 'Sandbox : 3 projets, 33 tâches, 5 campagnes, 15 documents insérés !';
END $$;
