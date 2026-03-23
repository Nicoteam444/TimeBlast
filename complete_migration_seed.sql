-- ═══════════════════════════════════════════════════════════════════
-- TIMEBLAST — Migration complète + Injection de toutes les données
-- Exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. CRÉATION DE TOUTES LES TABLES MANQUANTES
-- ─────────────────────────────────────────────────────────────────

-- Équipe (collaborateurs RH)
CREATE TABLE IF NOT EXISTS equipe (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at       timestamptz DEFAULT now(),
  societe_id       uuid REFERENCES societes(id) ON DELETE CASCADE,
  nom              text NOT NULL,
  prenom           text NOT NULL,
  email            text,
  telephone        text,
  poste            text,
  departement      text,
  date_embauche    date,
  date_naissance   date,
  type_contrat     text DEFAULT 'CDI',
  salaire_brut     numeric(10,2),
  temps_travail    integer DEFAULT 100,
  manager_direct   text,
  adresse          text,
  ville            text,
  code_postal      text,
  pays             text DEFAULT 'France',
  linkedin         text,
  actif            boolean DEFAULT true,
  competences      jsonb DEFAULT '[]',
  documents        jsonb DEFAULT '[]',
  notes            text,
  conges_restants  integer DEFAULT 25,
  jours_maladie    integer DEFAULT 0
);
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipe_all" ON equipe;
CREATE POLICY "equipe_all" ON equipe FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Factures
CREATE TABLE IF NOT EXISTS factures (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      timestamptz DEFAULT now(),
  societe_id      uuid REFERENCES societes(id) ON DELETE CASCADE,
  num_facture     text,
  date_emission   date,
  date_echeance   date,
  statut          text DEFAULT 'brouillon',
  client_nom      text,
  client_adresse  text,
  client_siret    text,
  objet           text,
  emetteur_nom    text,
  emetteur_siret  text,
  emetteur_email  text,
  lignes          jsonb DEFAULT '[]',
  notes           text,
  total_ht        numeric(15,2) DEFAULT 0,
  total_ttc       numeric(15,2) DEFAULT 0
);
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "factures_all" ON factures;
CREATE POLICY "factures_all" ON factures FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')));

-- Achats
CREATE TABLE IF NOT EXISTS achats (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            timestamptz DEFAULT now(),
  societe_id            uuid REFERENCES societes(id) ON DELETE CASCADE,
  fournisseur           text NOT NULL,
  reference             text,
  description           text,
  categorie             text DEFAULT 'autre',
  montant               numeric(15,2) DEFAULT 0,
  quantite              integer DEFAULT 1,
  date_achat            date,
  date_livraison_prevue date,
  statut                text DEFAULT 'commande'
);
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achats_all" ON achats;
CREATE POLICY "achats_all" ON achats FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')));

-- Stocks
CREATE TABLE IF NOT EXISTS stocks (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  societe_id   uuid REFERENCES societes(id) ON DELETE CASCADE,
  reference    text NOT NULL,
  nom          text NOT NULL,
  description  text,
  categorie    text DEFAULT 'autre',
  quantite     integer DEFAULT 0,
  quantite_min integer DEFAULT 0,
  prix_unitaire numeric(15,2) DEFAULT 0,
  fournisseur  text,
  localisation text
);
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stocks_all" ON stocks;
CREATE POLICY "stocks_all" ON stocks FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable','manager')));

-- Absences
CREATE TABLE IF NOT EXISTS absences (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  societe_id   uuid REFERENCES societes(id) ON DELETE CASCADE,
  equipe_id    uuid REFERENCES equipe(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  type_absence text DEFAULT 'conges_payes',
  date_debut   date NOT NULL,
  date_fin     date NOT NULL,
  nb_jours     numeric(4,1),
  statut       text DEFAULT 'en_attente',
  commentaire  text
);
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "absences_all" ON absences;
CREATE POLICY "absences_all" ON absences FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Notes de frais
CREATE TABLE IF NOT EXISTS notes_de_frais (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  societe_id    uuid REFERENCES societes(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  equipe_id     uuid REFERENCES equipe(id) ON DELETE SET NULL,
  titre         text,
  categorie     text DEFAULT 'autre',
  montant       numeric(10,2) DEFAULT 0,
  date_depense  date,
  statut        text DEFAULT 'brouillon',
  justificatif  text,
  description   text
);
ALTER TABLE notes_de_frais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ndf_all" ON notes_de_frais;
CREATE POLICY "ndf_all" ON notes_de_frais FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Journal comptable manuel
CREATE TABLE IF NOT EXISTS journal_entries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   timestamptz DEFAULT now(),
  societe_id   uuid REFERENCES societes(id) ON DELETE CASCADE,
  date_ecriture date NOT NULL,
  journal      text DEFAULT 'OD',
  libelle      text,
  piece_ref    text,
  valide       boolean DEFAULT false
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_entries_all" ON journal_entries;
CREATE POLICY "journal_entries_all" ON journal_entries FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable')));

CREATE TABLE IF NOT EXISTS journal_lines (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id         uuid REFERENCES journal_entries(id) ON DELETE CASCADE,
  compte_num       text NOT NULL,
  compte_lib       text,
  debit            numeric(15,2) DEFAULT 0,
  credit           numeric(15,2) DEFAULT 0
);
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_lines_all" ON journal_lines;
CREATE POLICY "journal_lines_all" ON journal_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','comptable')));

-- Organigramme canvas
CREATE TABLE IF NOT EXISTS org_nodes (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id        text DEFAULT 'admin_global',
  type             text NOT NULL,
  label            text NOT NULL,
  color            text DEFAULT '#1a5c82',
  x                float DEFAULT 100,
  y                float DEFAULT 100,
  width            float DEFAULT 160,
  height           float DEFAULT 80,
  societe_id       uuid REFERENCES societes(id) ON DELETE SET NULL,
  visibility_roles text[] DEFAULT '{}',
  meta             jsonb DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE org_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_nodes_admin" ON org_nodes;
CREATE POLICY "org_nodes_admin" ON org_nodes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS org_edges (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  canvas_id text DEFAULT 'admin_global',
  source_id uuid REFERENCES org_nodes(id) ON DELETE CASCADE,
  target_id uuid REFERENCES org_nodes(id) ON DELETE CASCADE,
  label     text
);
ALTER TABLE org_edges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_edges_admin" ON org_edges;
CREATE POLICY "org_edges_admin" ON org_edges FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Plannings
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
DROP POLICY IF EXISTS "plannings_all" ON plannings;
CREATE POLICY "plannings_all" ON plannings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Colonnes manquantes sur tables existantes
ALTER TABLE saisies_temps ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);
ALTER TABLE lots ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);
ALTER TABLE projets ADD COLUMN IF NOT EXISTS societe_id uuid REFERENCES societes(id);

CREATE INDEX IF NOT EXISTS idx_equipe_societe      ON equipe(societe_id);
CREATE INDEX IF NOT EXISTS idx_factures_societe    ON factures(societe_id);
CREATE INDEX IF NOT EXISTS idx_achats_societe      ON achats(societe_id);
CREATE INDEX IF NOT EXISTS idx_stocks_societe      ON stocks(societe_id);
CREATE INDEX IF NOT EXISTS idx_absences_societe    ON absences(societe_id);
CREATE INDEX IF NOT EXISTS idx_ndf_societe         ON notes_de_frais(societe_id);
CREATE INDEX IF NOT EXISTS idx_saisies_societe     ON saisies_temps(societe_id);
CREATE INDEX IF NOT EXISTS idx_plannings_societe   ON plannings(societe_id);

-- ─────────────────────────────────────────────────────────────────
-- 2. ÉQUIPE — collaborateurs par société
-- ─────────────────────────────────────────────────────────────────

TRUNCATE equipe CASCADE;

DO $$
DECLARE
  -- IDs sociétés (depuis full_reseed.sql)
  s_centre      uuid := '22222222-0001-0000-0000-000000000000';
  s_ouest       uuid := '22222222-0002-0000-0000-000000000000';
  s_sudouest    uuid := '22222222-0003-0000-0000-000000000000';
  s_sudest      uuid := '22222222-0004-0000-0000-000000000000';
  s_reunion     uuid := '22222222-0005-0000-0000-000000000000';
  s_antilles    uuid := '22222222-0006-0000-0000-000000000000';
  s_afrique     uuid := '22222222-0007-0000-0000-000000000000';
  s_madagascar  uuid := '22222222-0008-0000-0000-000000000000';
  s_info        uuid := '22222222-0009-0000-0000-000000000000';
  s_integration uuid := '22222222-0010-0000-0000-000000000000';
  s_solutions   uuid := '22222222-0011-0000-0000-000000000000';
  s_webmedia    uuid := '22222222-0012-0000-0000-000000000000';
  s_pilotin     uuid := '22222222-0013-0000-0000-000000000000';
  s_imageurs    uuid := '22222222-0014-0000-0000-000000000000';
  s_hexagram    uuid := '22222222-0015-0000-0000-000000000000';
  s_test        uuid := '22222222-0016-0000-0000-000000000000';
  s_services    uuid := '22222222-0017-0000-0000-000000000000';
BEGIN

-- === SRA TEST (Holding) ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_test,'Dupont','Nicolas','nicolas.dupont@sra.fr','06 10 00 00 01','Directeur Général','Direction','2018-01-15','CDI',95000,100,NULL,'Paris',12),
  (s_test,'Martin','Sophie','s.martin@sra.fr','06 10 00 00 02','Directrice Administrative','Direction','2019-03-01','CDI',72000,100,'Nicolas Dupont','Paris',18),
  (s_test,'Bernard','Julien','j.bernard@sra.fr','06 10 00 00 03','DSI','Direction IT','2020-06-01','CDI',78000,100,'Nicolas Dupont','Paris',22),
  (s_test,'Petit','Camille','c.petit@sra.fr','06 10 00 00 04','Contrôleur de gestion','Finance','2021-09-01','CDI',58000,100,'Sophie Martin','Paris',15);

-- === SRA Centre ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_centre,'Leclerc','Marc','m.leclerc@sra-centre.fr','04 72 00 01 01','Directeur de mission','Management','2017-04-01','CDI',82000,100,NULL,'Lyon',8),
  (s_centre,'Rousseau','Éléonore','e.rousseau@sra-centre.fr','04 72 00 01 02','Chef de projet','Projets','2019-07-01','CDI',55000,100,'Marc Leclerc','Lyon',16),
  (s_centre,'Moreau','Thomas','t.moreau@sra-centre.fr','04 72 00 01 03','Consultant senior','Conseil','2020-02-15','CDI',48000,100,'Marc Leclerc','Lyon',20),
  (s_centre,'Simon','Lucie','l.simon@sra-centre.fr','04 72 00 01 04','Consultante','Conseil','2022-09-01','CDI',38000,100,'Éléonore Rousseau','Lyon',23),
  (s_centre,'Laurent','Baptiste','b.laurent@sra-centre.fr','04 72 00 01 05','Analyste','Études','2023-03-01','CDI',34000,100,'Thomas Moreau','Lyon',25);

-- === SRA Ouest ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_ouest,'Fontaine','Alexis','a.fontaine@sra-ouest.fr','02 40 00 02 01','Directeur régional','Direction','2016-11-01','CDI',88000,100,NULL,'Nantes',5),
  (s_ouest,'Blanchard','Marie','m.blanchard@sra-ouest.fr','02 40 00 02 02','Responsable projets','Projets','2018-05-01','CDI',58000,100,'Alexis Fontaine','Nantes',14),
  (s_ouest,'Garnier','Pierre','p.garnier@sra-ouest.fr','02 40 00 02 03','Consultant senior','Conseil','2020-10-01','CDI',46000,100,'Marie Blanchard','Nantes',20),
  (s_ouest,'Girard','Nathalie','n.girard@sra-ouest.fr','02 40 00 02 04','Consultante','Conseil','2021-06-01','CDI',38000,100,'Marie Blanchard','Nantes',22);

-- === SRA Sud-Ouest ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_sudouest,'Renard','Isabelle','i.renard@sra-sudouest.fr','05 56 00 03 01','Directrice','Direction','2015-06-01','CDI',90000,100,NULL,'Bordeaux',3),
  (s_sudouest,'David','Antoine','a.david@sra-sudouest.fr','05 56 00 03 02','Chef de projet senior','Projets','2017-09-01','CDI',62000,100,'Isabelle Renard','Bordeaux',11),
  (s_sudouest,'Leroy','Mathilde','m.leroy@sra-sudouest.fr','05 56 00 03 03','Consultante senior','Conseil','2019-04-01','CDI',50000,100,'Antoine David','Bordeaux',18),
  (s_sudouest,'Dupuis','Gabriel','g.dupuis@sra-sudouest.fr','05 56 00 03 04','Analyste','Études','2022-01-10','CDI',35000,100,'Mathilde Leroy','Bordeaux',25);

-- === SRA Sud-Est ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_sudest,'Mercier','Frédéric','f.mercier@sra-sudest.fr','04 91 00 04 01','Directeur de pôle','Direction','2014-03-01','CDI',92000,100,NULL,'Marseille',6),
  (s_sudest,'Morel','Céline','c.morel@sra-sudest.fr','04 91 00 04 02','Responsable technique','Technique','2018-01-01','CDI',60000,100,'Frédéric Mercier','Marseille',13),
  (s_sudest,'Lefebvre','Romain','r.lefebvre@sra-sudest.fr','04 91 00 04 03','Consultant','Conseil','2020-08-01','CDI',44000,100,'Céline Morel','Marseille',20),
  (s_sudest,'Robin','Clara','c.robin@sra-sudest.fr','04 91 00 04 04','Consultante junior','Conseil','2023-09-01','CDI',32000,100,'Romain Lefebvre','Marseille',25);

-- === SRA Réunion ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_reunion,'Payet','Jean-Claude','jc.payet@sra-reunion.fr','02 62 00 05 01','Directeur','Direction','2016-07-01','CDI',85000,100,NULL,'Saint-Denis',9),
  (s_reunion,'Grondin','Valérie','v.grondin@sra-reunion.fr','02 62 00 05 02','Chef de projet','Projets','2019-02-01','CDI',52000,100,'Jean-Claude Payet','Saint-Denis',18),
  (s_reunion,'Hoarau','Kevin','k.hoarau@sra-reunion.fr','02 62 00 05 03','Consultant','Conseil','2021-10-01','CDI',40000,100,'Valérie Grondin','Saint-Denis',23);

-- === SRA Antilles ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_antilles,'Luce','Patrick','p.luce@sra-antilles.fr','05 96 00 06 01','Directeur Martinique','Direction','2017-01-01','CDI',83000,100,NULL,'Fort-de-France'),
  (s_antilles,'Célestin','Audrey','a.celestin@sra-antilles.fr','05 96 00 06 02','Responsable projets','Projets','2019-05-01','CDI',50000,100,'Patrick Luce','Fort-de-France'),
  (s_antilles,'Joseph','Marc','m.joseph@sra-antilles.fr','05 96 00 06 03','Consultant','Conseil','2021-03-01','CDI',40000,100,'Audrey Célestin','Fort-de-France');

-- === SRA Afrique ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_afrique,'Diallo','Mamadou','m.diallo@sra-afrique.fr','+221 77 000 00 01','Directeur Afrique','Direction','2018-04-01','CDI',75000,100,NULL,'Dakar'),
  (s_afrique,'Touré','Fatoumata','f.toure@sra-afrique.fr','+221 77 000 00 02','Chef de projet','Projets','2020-01-01','CDI',48000,100,'Mamadou Diallo','Dakar'),
  (s_afrique,'Sow','Ibrahima','i.sow@sra-afrique.fr','+221 77 000 00 03','Consultant senior','Conseil','2021-06-01','CDI',42000,100,'Fatoumata Touré','Dakar');

-- === SRA Madagascar ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_madagascar,'Rakoto','Andry','a.rakoto@sra-mada.fr','+261 20 00 00 01','Directeur','Direction','2019-06-01','CDI',55000,100,NULL,'Antananarivo'),
  (s_madagascar,'Razafy','Miora','m.razafy@sra-mada.fr','+261 20 00 00 02','Cheffe de projet','Projets','2020-10-01','CDI',36000,100,'Andry Rakoto','Antananarivo'),
  (s_madagascar,'Rakotondrabe','Hery','h.rako@sra-mada.fr','+261 20 00 00 03','Consultant','Conseil','2022-04-01','CDI',28000,100,'Miora Razafy','Antananarivo');

-- === SRA Informatique ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_info,'Patel','Raj','r.patel@sra-info.fr','01 80 00 09 01','Directeur technique','Direction IT','2016-03-01','CDI',95000,100,NULL,'Paris',7),
  (s_info,'Chen','Laura','l.chen@sra-info.fr','01 80 00 09 02','Architecte solution','Architecture','2018-07-01','CDI',72000,100,'Raj Patel','Paris',13),
  (s_info,'Nguyen','Tuan','t.nguyen@sra-info.fr','01 80 00 09 03','Ingénieur DevOps','Infrastructure','2019-11-01','CDI',58000,100,'Laura Chen','Paris',18),
  (s_info,'Hamid','Sara','s.hamid@sra-info.fr','01 80 00 09 04','Développeuse senior','Dev','2020-06-01','CDI',55000,100,'Laura Chen','Paris',20),
  (s_info,'Kowalski','Jan','j.kowalski@sra-info.fr','01 80 00 09 05','Développeur','Dev','2022-09-01','CDI',42000,100,'Sara Hamid','Paris',24);

-- === SRA Integration ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_integration,'Vidal','Stéphane','s.vidal@sra-integration.fr','05 61 00 10 01','Directeur intégration','Direction','2015-10-01','CDI',90000,100,NULL,'Toulouse',4),
  (s_integration,'Bonnet','Claire','c.bonnet@sra-integration.fr','05 61 00 10 02','Architecte intégration','Architecture','2018-02-01','CDI',68000,100,'Stéphane Vidal','Toulouse',14),
  (s_integration,'Faure','Nicolas','n.faure@sra-integration.fr','05 61 00 10 03','Ingénieur intégration','Technique','2020-05-01','CDI',52000,100,'Claire Bonnet','Toulouse',19),
  (s_integration,'Arnaud','Julie','j.arnaud@sra-integration.fr','05 61 00 10 04','Développeuse API','Dev','2021-11-01','CDI',46000,100,'Claire Bonnet','Toulouse',22);

-- === SRA Solutions ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_solutions,'Chevalier','Bertrand','b.chevalier@sra-solutions.fr','01 80 00 11 01','Directeur produit','Direction','2014-09-01','CDI',98000,100,NULL,'Paris',2),
  (s_solutions,'Lemaire','Audrey','a.lemaire@sra-solutions.fr','01 80 00 11 02','Product Manager','Produit','2017-04-01','CDI',65000,100,'Bertrand Chevalier','Paris',10),
  (s_solutions,'Henry','Nicolas','n.henry@sra-solutions.fr','01 80 00 11 03','Développeur senior','Dev','2019-08-01','CDI',58000,100,'Audrey Lemaire','Paris',16),
  (s_solutions,'Perrin','Anaïs','a.perrin@sra-solutions.fr','01 80 00 11 04','Data Engineer','Data','2021-02-01','CDI',52000,100,'Bertrand Chevalier','Paris',21);

-- === WEBMEDIA RM ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_webmedia,'Roux','Damien','d.roux@webmedia-rm.fr','01 80 00 12 01','Directeur création','Direction','2015-05-01','CDI',88000,100,NULL,'Paris',7),
  (s_webmedia,'Caron','Inès','i.caron@webmedia-rm.fr','01 80 00 12 02','Directrice artistique','Créatif','2017-10-01','CDI',58000,100,'Damien Roux','Paris',14),
  (s_webmedia,'Michaud','Paul','p.michaud@webmedia-rm.fr','01 80 00 12 03','Développeur full-stack','Tech','2019-06-01','CDI',52000,100,'Damien Roux','Paris',18),
  (s_webmedia,'Barbier','Léa','l.barbier@webmedia-rm.fr','01 80 00 12 04','UX Designer','Design','2021-03-01','CDI',44000,100,'Inès Caron','Paris',22);

-- === PILOT'IN ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_pilotin,'Gaillard','Olivier','o.gaillard@pilotin.fr','01 80 00 13 01','CEO','Direction','2013-01-01','CDI',105000,100,NULL,'Paris',5),
  (s_pilotin,'Brun','Émilie','e.brun@pilotin.fr','01 80 00 13 02','Responsable PMO','PMO','2016-07-01','CDI',62000,100,'Olivier Gaillard','Paris',12),
  (s_pilotin,'Perez','Carlos','c.perez@pilotin.fr','01 80 00 13 03','Consultant PMO','PMO','2019-10-01','CDI',48000,100,'Émilie Brun','Paris',19);

-- === LES IMAGEURS ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_imageurs,'Vaillant','Serge','s.vaillant@lesimageurs.fr','01 80 00 14 01','Directeur photo','Direction','2012-06-01','CDI',75000,100,NULL,'Paris',10),
  (s_imageurs,'Collet','Mélanie','m.collet@lesimageurs.fr','01 80 00 14 02','Photographe senior','Photo','2016-03-01','CDI',42000,100,'Serge Vaillant','Paris',16),
  (s_imageurs,'Tessier','Hugo','h.tessier@lesimageurs.fr','01 80 00 14 03','Vidéaste','Vidéo','2018-09-01','CDI',38000,100,'Serge Vaillant','Paris',20);

-- === HEXAGRAM ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_hexagram,'Lambert','Chloé','c.lambert@hexagram.fr','01 80 00 15 01','Directrice créative','Direction','2014-02-01','CDI',85000,100,NULL,'Paris',8),
  (s_hexagram,'Marchand','Kevin','k.marchand@hexagram.fr','01 80 00 15 02','Designer UX/UI','Design','2017-11-01','CDI',52000,100,'Chloé Lambert','Paris',14),
  (s_hexagram,'Dupré','Zoé','z.dupre@hexagram.fr','01 80 00 15 03','Motion Designer','Motion','2020-04-01','CDI',44000,100,'Chloé Lambert','Paris',20);

-- === SRA Services ===
INSERT INTO equipe (societe_id,nom,prenom,email,telephone,poste,departement,date_embauche,type_contrat,salaire_brut,temps_travail,manager_direct,ville,conges_restants) VALUES
  (s_services,'Benoit','Thierry','t.benoit@sra-services.fr','02 99 00 17 01','Directeur services','Direction','2016-06-01','CDI',86000,100,NULL,'Rennes',7),
  (s_services,'Guillot','Sylvie','s.guillot@sra-services.fr','02 99 00 17 02','Responsable TMA','TMA','2018-03-01','CDI',58000,100,'Thierry Benoit','Rennes',14),
  (s_services,'Picard','Maxime','m.picard@sra-services.fr','02 99 00 17 03','Technicien support N2','Support','2020-09-01','CDI',38000,100,'Sylvie Guillot','Rennes',20),
  (s_services,'Lecomte','Anaëlle','a.lecomte@sra-services.fr','02 99 00 17 04','Développeuse','Dev','2022-06-01','CDI',42000,100,'Maxime Picard','Rennes',23);

END $$;

-- ─────────────────────────────────────────────────────────────────
-- 3. LOTS (phases de projets = interventions)
-- ─────────────────────────────────────────────────────────────────

-- Créer des lots pour chaque projet existant
INSERT INTO lots (projet_id, name, jours_alloues, societe_id)
SELECT
  p.id,
  phases.name,
  phases.jours,
  p.societe_id  -- propagation depuis le projet (si colonne existe)
FROM projets p
CROSS JOIN LATERAL (
  VALUES
    ('Cadrage & initialisation',    ROUND((p.total_jours * 0.15)::numeric, 1)),
    ('Analyse & conception',        ROUND((p.total_jours * 0.25)::numeric, 1)),
    ('Réalisation / Intervention',  ROUND((p.total_jours * 0.40)::numeric, 1)),
    ('Recette & validation',        ROUND((p.total_jours * 0.15)::numeric, 1)),
    ('Déploiement & support',       ROUND((p.total_jours * 0.05)::numeric, 1))
) AS phases(name, jours)
WHERE NOT EXISTS (SELECT 1 FROM lots WHERE projet_id = p.id)
ON CONFLICT DO NOTHING;

-- Propager societe_id aux lots depuis projets (via clients)
UPDATE lots l
SET societe_id = c.societe_id
FROM projets p
JOIN clients c ON c.id = p.client_id
WHERE l.projet_id = p.id AND l.societe_id IS NULL;

-- ─────────────────────────────────────────────────────────────────
-- 4. SAISIES_TEMPS (données d'intervention)
-- Génère des saisies réalistes sur les 60 derniers jours
-- ─────────────────────────────────────────────────────────────────

INSERT INTO saisies_temps (user_id, lot_id, date, heures, commentaire, societe_id)
SELECT
  p.id                                                        AS user_id,
  l.id                                                        AS lot_id,
  (CURRENT_DATE - (seq.n || ' days')::interval)::date        AS date,
  ROUND((4 + random() * 4)::numeric, 1)                      AS heures,
  json_build_object(
    'project', proj.name,
    'lot',     l.name,
    'note',    'Intervention sur ' || l.name
  )::text                                                     AS commentaire,
  l.societe_id
FROM profiles p
CROSS JOIN LATERAL (SELECT generate_series(1, 55, 7) AS n) seq
JOIN lots l ON true
JOIN projets proj ON proj.id = l.projet_id
JOIN clients c ON c.id = proj.client_id AND c.societe_id = p.societe_id
WHERE p.societe_id IS NOT NULL
  AND p.role IN ('collaborateur','manager')
  AND l.societe_id = p.societe_id
  AND random() < 0.35
  AND (CURRENT_DATE - (seq.n || ' days')::interval)::date NOT IN (
    SELECT generate_series(
      DATE_TRUNC('week', CURRENT_DATE - (seq.n || ' days')::interval)::date + 5,
      DATE_TRUNC('week', CURRENT_DATE - (seq.n || ' days')::interval)::date + 6,
      '1 day'
    )
  )
ON CONFLICT (user_id, lot_id, date) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 5. FACTURES
-- ─────────────────────────────────────────────────────────────────

TRUNCATE factures CASCADE;

DO $$
DECLARE
  s_id    uuid;
  s_rec   record;
  c_rec   record;
  fac_num integer;
  lig     jsonb;
  ht      numeric;
  ttc     numeric;
  statuts text[] := ARRAY['brouillon','en_attente','envoyee','payee','payee','payee'];
BEGIN
  FOR s_rec IN SELECT s.id, s.name, s.siren FROM societes s ORDER BY s.name LOOP
    s_id := s_rec.id;
    fac_num := 1;

    FOR c_rec IN
      SELECT c.name AS cname FROM clients c WHERE c.societe_id = s_id LIMIT 3
    LOOP
      ht := ROUND((8000 + random() * 42000)::numeric, 2);
      ttc := ROUND(ht * 1.20, 2);
      lig := json_build_array(
        json_build_object('desc','Mission conseil — ' || c_rec.cname,'qte',ROUND((15 + random()*25)::numeric,0),'pu',ROUND((ht / 20)::numeric,2),'tva',20,'montant',ROUND(ht * 0.65, 2)),
        json_build_object('desc','Frais de déplacement','qte',1,'pu',ROUND(ht * 0.05, 2),'tva',20,'montant',ROUND(ht * 0.05, 2)),
        json_build_object('desc','Livrables documentaires','qte',1,'pu',ROUND(ht * 0.30, 2),'tva',20,'montant',ROUND(ht * 0.30, 2))
      );

      INSERT INTO factures (
        societe_id, num_facture, date_emission, date_echeance,
        statut, client_nom, client_adresse, client_siret,
        objet, emetteur_nom, emetteur_siret, emetteur_email,
        lignes, total_ht, total_ttc
      ) VALUES (
        s_id,
        UPPER(LEFT(s_rec.name, 4)) || '-2026-' || LPAD(fac_num::text, 4, '0'),
        CURRENT_DATE - (random() * 60)::integer,
        CURRENT_DATE + (30 + random() * 30)::integer,
        statuts[1 + (random() * 5)::integer],
        c_rec.cname,
        '1 avenue de la République, 75011 Paris',
        s_rec.siren || '00014',
        'Prestation de conseil — ' || c_rec.cname,
        s_rec.name,
        s_rec.siren,
        'facturation@' || LOWER(REPLACE(s_rec.name, ' ', '')) || '.fr',
        lig, ht, ttc
      );
      fac_num := fac_num + 1;
    END LOOP;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────
-- 6. ACHATS
-- ─────────────────────────────────────────────────────────────────

TRUNCATE achats CASCADE;

INSERT INTO achats (societe_id, fournisseur, reference, description, categorie, montant, quantite, date_achat, date_livraison_prevue, statut)
SELECT
  s.id,
  fournisseur,
  reference,
  description,
  categorie,
  montant,
  quantite,
  CURRENT_DATE - (random() * 90)::integer,
  CURRENT_DATE + (random() * 30)::integer,
  statut
FROM societes s
CROSS JOIN (VALUES
  ('Dell Technologies',   'REF-DELL-001',  'Ordinateur portable Dell Latitude',    'materiel',   1299.00, 2, 'recu'),
  ('Microsoft',           'MS-365-ENT',    'Licences Microsoft 365 Business',       'logiciel',    189.00, 5, 'recu'),
  ('Amazon Web Services', 'AWS-EC2-2026',  'Instances cloud EC2 mensuelles',        'prestation', 2400.00, 1, 'en_cours'),
  ('Office Dépôt',        'OFF-PAPE-042',  'Fournitures de bureau Q1 2026',         'fourniture',  340.00, 1, 'recu'),
  ('Zoom',                'ZOOM-PRO-2026', 'Abonnement Zoom Pro annuel',            'logiciel',   1680.00, 1, 'recu'),
  ('SNCF',                'SNCF-ABON',     'Abonnements TGV Pro collaborateurs',    'prestation',  850.00, 3, 'commande'),
  ('Slack',               'SLACK-PRO',     'Licences Slack Pro',                    'logiciel',    420.00, 10, 'recu'),
  ('Steelcase',           'STEEL-CHAISE',  'Chaises de bureau ergonomiques',        'materiel',    650.00, 4, 'en_attente')
) AS items(fournisseur, reference, description, categorie, montant, quantite, statut);

-- ─────────────────────────────────────────────────────────────────
-- 7. STOCKS
-- ─────────────────────────────────────────────────────────────────

TRUNCATE stocks CASCADE;

INSERT INTO stocks (societe_id, reference, nom, description, categorie, quantite, quantite_min, prix_unitaire, fournisseur, localisation)
SELECT
  s.id,
  ref,
  nom,
  description,
  categorie,
  (2 + random() * 18)::integer,
  seuil,
  prix,
  fournisseur,
  localisation
FROM societes s
CROSS JOIN (VALUES
  ('MAT-PC-001',   'Ordinateurs portables',       'Dell Latitude 5540 i7',        'materiel',   3,   1299.00, 'Dell Technologies', 'Salle IT — Armoire A'),
  ('LOG-MS365',    'Licences Microsoft 365',       'Business Premium',             'logiciel',   2,    189.00, 'Microsoft',         'Gestionnaire licences'),
  ('CONS-PAPIER',  'Ramettes papier A4',           '80g/m² blanc',                 'consommable',10,     6.50, 'Staples',           'Réserve bureau'),
  ('EQP-CAMERA',  'Caméra de conférence',          'Logitech Rally Bar',           'equipement', 1,    899.00, 'Logitech',          'Salle de réunion'),
  ('LOG-ADOBE',   'Licences Adobe Creative Cloud', 'Formule équipe',               'logiciel',   3,     59.99, 'Adobe',             'Gestionnaire licences'),
  ('CONS-TONER',  'Cartouches toner',              'HP LaserJet noir',             'consommable', 5,     75.00, 'HP',                'Imprimante — Armoire B'),
  ('MAT-ECRAN',   'Écrans 27 pouces',              'Dell UltraSharp 4K',           'materiel',   2,    449.00, 'Dell Technologies', 'Salle IT — Armoire A'),
  ('EQP-CASQUE',  'Casques audio',                 'Jabra Evolve2 65 USB-A',       'equipement', 3,    249.00, 'Jabra',             'Salle IT — Armoire B')
) AS items(ref, nom, description, categorie, seuil, prix, fournisseur, localisation);

-- ─────────────────────────────────────────────────────────────────
-- 8. ABSENCES
-- ─────────────────────────────────────────────────────────────────

TRUNCATE absences CASCADE;

INSERT INTO absences (societe_id, equipe_id, type_absence, date_debut, date_fin, nb_jours, statut, commentaire)
SELECT
  e.societe_id,
  e.id,
  type_absence,
  CURRENT_DATE + debut_offset,
  CURRENT_DATE + debut_offset + duree - 1,
  duree,
  statut,
  commentaire
FROM equipe e
CROSS JOIN LATERAL (VALUES
  ('conges_payes',  5,  5, 'approuve',    'Congés annuels printemps'),
  ('rtt',           3,  1, 'approuve',    'RTT'),
  ('formation',    15,  3, 'en_attente',  'Formation Agile & Scrum'),
  ('maladie',      -8,  2, 'approuve',    'Arrêt maladie')
) AS abs(type_absence, debut_offset, duree, statut, commentaire)
WHERE random() < 0.3;

-- ─────────────────────────────────────────────────────────────────
-- 9. NOTES DE FRAIS
-- ─────────────────────────────────────────────────────────────────

TRUNCATE notes_de_frais CASCADE;

INSERT INTO notes_de_frais (societe_id, equipe_id, titre, categorie, montant, date_depense, statut, description, justificatif)
SELECT
  e.societe_id,
  e.id,
  categorie || ' — ' || e.prenom || ' ' || e.nom,
  categorie,
  ROUND((montant_base + random() * 80)::numeric, 2),
  CURRENT_DATE - (random() * 60)::integer,
  statut,
  description,
  'JUST-' || UPPER(LEFT(e.nom, 3)) || '-' || LPAD((random()*999)::integer::text, 3, '0')
FROM equipe e
CROSS JOIN (VALUES
  ('transport',    45,  'valide',     'Billet train Paris-Lyon A/R mission client'),
  ('repas',        32,  'soumis',     'Déjeuner client — restauration'),
  ('hebergement', 120,  'valide',     'Nuit hôtel déplacement mission'),
  ('transport',    18,  'rembourse',  'Taxi aéroport'),
  ('materiel',     65,  'brouillon',  'Achat câble HDMI et accessoires'),
  ('repas',        24,  'soumis',     'Dîner équipe fin de mission')
) AS ndf(categorie, montant_base, statut, description)
WHERE random() < 0.25;

-- ─────────────────────────────────────────────────────────────────
-- 10. PLANNINGS (interventions planifiées)
-- ─────────────────────────────────────────────────────────────────

TRUNCATE plannings CASCADE;

INSERT INTO plannings (societe_id, user_key, user_label, label, color, date_debut, date_fin)
SELECT
  e.societe_id,
  e.id::text,
  e.prenom || ' ' || e.nom,
  CASE (random() * 4)::integer
    WHEN 0 THEN 'Mission terrain — ' || c.name
    WHEN 1 THEN 'Atelier client — ' || c.name
    WHEN 2 THEN 'Comité de pilotage'
    WHEN 3 THEN 'Formation interne'
    ELSE 'Intervention — ' || c.name
  END,
  CASE (random() * 5)::integer
    WHEN 0 THEN '#6366f1'
    WHEN 1 THEN '#0891b2'
    WHEN 2 THEN '#16a34a'
    WHEN 3 THEN '#f59e0b'
    ELSE '#ec4899'
  END,
  CURRENT_DATE + (random() * 60)::integer,
  CURRENT_DATE + (random() * 60)::integer + (1 + random() * 4)::integer
FROM equipe e
JOIN clients c ON c.societe_id = e.societe_id
WHERE random() < 0.2
LIMIT 120;

-- ─────────────────────────────────────────────────────────────────
-- 11. VÉRIFICATION FINALE
-- ─────────────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM equipe)          AS equipe,
  (SELECT COUNT(*) FROM lots)            AS lots,
  (SELECT COUNT(*) FROM saisies_temps)   AS saisies_temps,
  (SELECT COUNT(*) FROM factures)        AS factures,
  (SELECT COUNT(*) FROM achats)          AS achats,
  (SELECT COUNT(*) FROM stocks)          AS stocks,
  (SELECT COUNT(*) FROM absences)        AS absences,
  (SELECT COUNT(*) FROM notes_de_frais)  AS notes_de_frais,
  (SELECT COUNT(*) FROM plannings)       AS plannings,
  (SELECT COUNT(*) FROM clients)         AS clients,
  (SELECT COUNT(*) FROM transactions)    AS transactions,
  (SELECT COUNT(*) FROM projets)         AS projets;
