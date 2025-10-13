
-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Tables
create table if not exists empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  cpf text,
  telefone text,
  email text,
  logo text,
  created_at timestamp with time zone default now()
);

create table if not exists usuarios (
  id uuid primary key, -- references auth.users
  nome text not null,
  email text not null,
  empresa_id uuid not null references empresas(id) on delete cascade,
  cargo text not null check (cargo in ('admin','fisioterapeuta')),
  created_at timestamp with time zone default now()
);

create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text not null,
  diagnostico text,
  empresa_id uuid not null references empresas(id) on delete cascade,
  fisioterapeuta_id uuid references usuarios(id) on delete set null,
  data_nascimento date,
  telefone text,
  email text,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamp with time zone default now()
);

create table if not exists anamneses (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  queixa_principal text,
  historico_clinico text,
  limitacoes text,
  medicacoes text,
  objetivos text,
  dor int check (dor between 0 and 10),
  created_at timestamp with time zone default now()
);

create table if not exists exercicios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  midia text,
  favorito boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete set null,
  empresa_id uuid not null references empresas(id) on delete cascade,
  data timestamp with time zone not null,
  tipo text not null,
  observacoes text,
  dor int check (dor between 0 and 10),
  evolucao text,
  status text default 'agendado' check (status in ('agendado','concluido','cancelado')),
  created_at timestamp with time zone default now()
);

-- Helper function to get empresa_id from logged user
create or replace function public.current_empresa_id()
returns uuid
language sql stable security definer
as $$
  select empresa_id from usuarios where id = auth.uid();
$$;

-- Default values: set empresa_id automatically on insert when null
create or replace function public.set_empresa_id()
returns trigger
language plpgsql
as $$
begin
  if NEW.empresa_id is null then
    NEW.empresa_id := public.current_empresa_id();
  end if;
  return NEW;
end; $$;

create trigger set_empresa_id_pacientes before insert on pacientes for each row execute function set_empresa_id();
create trigger set_empresa_id_anamneses before insert on anamneses for each row execute function set_empresa_id();
create trigger set_empresa_id_sessoes before insert on sessoes for each row execute function set_empresa_id();
create trigger set_empresa_id_exercicios before insert on exercicios for each row execute function set_empresa_id();

-- RLS
alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table pacientes enable row level security;
alter table anamneses enable row level security;
alter table exercicios enable row level security;
alter table sessoes enable row level security;

-- Policies
-- Empresas: user can see only their empresa; admins can insert (to allow setup via service route we can also allow service key)
create policy "empresas_select_own" on empresas
for select using ( id = public.current_empresa_id() );

create policy "empresas_insert_auth" on empresas
for insert to authenticated with check ( true );

create policy "empresas_update_admin" on empresas
for update using ( exists (select 1 from usuarios u where u.id = auth.uid() and u.empresa_id = id and u.cargo = 'admin') );

-- Usuarios: user can see self; admin can manage same empresa
create policy "usuarios_select_self_or_same_empresa" on usuarios
for select using (
  id = auth.uid() or empresa_id = public.current_empresa_id()
);

create policy "usuarios_insert_admin" on usuarios
for insert to authenticated with check (
  empresa_id = public.current_empresa_id()
);

create policy "usuarios_update_self_or_admin" on usuarios
for update using (
  id = auth.uid() or (empresa_id = public.current_empresa_id())
);

-- Pacientes: scoped by empresa
create policy "pacientes_all_scoped" on pacientes
for all using ( empresa_id = public.current_empresa_id() )
with check ( empresa_id = public.current_empresa_id() );

-- Anamneses: scoped by empresa
create policy "anamneses_all_scoped" on anamneses
for all using ( empresa_id = public.current_empresa_id() )
with check ( empresa_id = public.current_empresa_id() );

-- Exercicios: scoped by empresa
create policy "exercicios_all_scoped" on exercicios
for all using ( empresa_id = public.current_empresa_id() )
with check ( empresa_id = public.current_empresa_id() );

-- Sessoes: scoped by empresa
create policy "sessoes_all_scoped" on sessoes
for all using ( empresa_id = public.current_empresa_id() )
with check ( empresa_id = public.current_empresa_id() );

-- Convenience RPC to attach empresa_id to existing rows (if needed)
create or replace function public.attach_empresa_ids()
returns void language plpgsql security definer as $$
declare eid uuid;
begin
  eid := public.current_empresa_id();
  update pacientes set empresa_id = coalesce(empresa_id, eid) where empresa_id is null;
  update anamneses set empresa_id = coalesce(empresa_id, eid) where empresa_id is null;
  update exercicios set empresa_id = coalesce(exercicios.empresa_id, eid) where empresa_id is null;
  update sessoes set empresa_id = coalesce(sessoes.empresa_id, eid) where empresa_id is null;
end $$;
