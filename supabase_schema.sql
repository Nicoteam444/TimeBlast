-- ============================================================
-- TIMEBLAST - Schéma initial
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- Extension UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILS UTILISATEURS
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'manager', 'collaborateur', 'comptable')),
  created_at timestamptz default now()
);

-- Créer automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'collaborateur');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- MODULE TEMPS
-- ============================================================

-- Clients
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- Projets
create table public.projets (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.clients(id) on delete set null,
  name text not null,
  total_jours numeric(10,2) not null default 0,
  date_debut date,
  date_fin date,
  statut text not null default 'actif' check (statut in ('actif', 'termine', 'suspendu')),
  created_at timestamptz default now()
);

-- Lots (phases d'un projet)
create table public.lots (
  id uuid primary key default uuid_generate_v4(),
  projet_id uuid references public.projets(id) on delete cascade,
  name text not null,
  jours_alloues numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

-- Assignations : qui travaille sur quel lot, combien de jours planifiés
create table public.assignations (
  id uuid primary key default uuid_generate_v4(),
  lot_id uuid references public.lots(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  jours_planifies numeric(10,2) not null default 0,
  created_at timestamptz default now(),
  unique(lot_id, user_id)
);

-- Saisies de temps (pointage quotidien)
create table public.saisies_temps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  lot_id uuid references public.lots(id) on delete cascade,
  date date not null,
  heures numeric(4,2) not null check (heures > 0 and heures <= 24),
  commentaire text,
  created_at timestamptz default now(),
  unique(user_id, lot_id, date)
);

-- ============================================================
-- MODULE COMPTA
-- ============================================================

-- Sociétés
create table public.societes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  siren text,
  created_at timestamptz default now()
);

-- Imports FEC
create table public.fec_imports (
  id uuid primary key default uuid_generate_v4(),
  societe_id uuid references public.societes(id) on delete cascade,
  annee int not null,
  filename text not null,
  imported_at timestamptz default now(),
  imported_by uuid references public.profiles(id)
);

-- Écritures FEC
create table public.fec_ecritures (
  id uuid primary key default uuid_generate_v4(),
  import_id uuid references public.fec_imports(id) on delete cascade,
  journal_code text,
  journal_lib text,
  ecriture_num text,
  ecriture_date date,
  compte_num text,
  compte_lib text,
  comp_aux_num text,
  comp_aux_lib text,
  piece_ref text,
  piece_date date,
  ecriture_lib text,
  debit numeric(15,2) default 0,
  credit numeric(15,2) default 0,
  ecriture_let text,
  date_let date,
  valid_date date,
  montant_devise numeric(15,2),
  idevise text
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projets enable row level security;
alter table public.lots enable row level security;
alter table public.assignations enable row level security;
alter table public.saisies_temps enable row level security;
alter table public.societes enable row level security;
alter table public.fec_imports enable row level security;
alter table public.fec_ecritures enable row level security;

-- Profils : chacun voit son propre profil, admin voit tout
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ));

create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id);

-- Projets/lots/clients : visibles par tous les connectés
create policy "projets_select" on public.projets for select using (auth.role() = 'authenticated');
create policy "lots_select" on public.lots for select using (auth.role() = 'authenticated');
create policy "clients_select" on public.clients for select using (auth.role() = 'authenticated');
create policy "assignations_select" on public.assignations for select using (auth.role() = 'authenticated');

-- Projets/lots/clients : modifiables par admin et manager uniquement
create policy "projets_write" on public.projets for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager'))
);
create policy "lots_write" on public.lots for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager'))
);
create policy "clients_write" on public.clients for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager'))
);
create policy "assignations_write" on public.assignations for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager'))
);

-- Saisies : chacun voit et modifie les siennes, admin/manager voient tout
create policy "saisies_select" on public.saisies_temps for select
  using (auth.uid() = user_id or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'manager')
  ));
create policy "saisies_insert" on public.saisies_temps for insert
  with check (auth.uid() = user_id);
create policy "saisies_update" on public.saisies_temps for update
  using (auth.uid() = user_id);
create policy "saisies_delete" on public.saisies_temps for delete
  using (auth.uid() = user_id);

-- Compta : admin et comptable uniquement
create policy "societes_all" on public.societes for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'comptable'))
);
create policy "fec_imports_all" on public.fec_imports for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'comptable'))
);
create policy "fec_ecritures_all" on public.fec_ecritures for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'comptable'))
);
