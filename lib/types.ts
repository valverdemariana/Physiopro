
export type Empresa = {
  id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  created_at?: string;
};

export type Usuario = {
  id: string; // auth.users.id
  nome: string;
  email: string;
  empresa_id: string;
  cargo: "admin" | "fisioterapeuta";
};

export type Paciente = {
  id: string;
  nome: string;
  cpf: string;
  diagnostico?: string | null;
  empresa_id: string;
  fisioterapeuta_id?: string | null;
  data_nascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  ativo: boolean;
  observacoes?: string | null;
};

export type Anamnese = {
  id: string;
  paciente_id: string;
  empresa_id: string;
  queixa_principal?: string;
  historico_clinico?: string;
  limitacoes?: string;
  medicacoes?: string;
  objetivos?: string;
  dor?: number;
};

export type Sessao = {
  id: string;
  paciente_id: string;
  empresa_id: string;
  data: string; // ISO
  tipo: string;
  observacoes?: string;
  dor?: number;
  evolucao?: string;
  status?: "agendado" | "concluido" | "cancelado";
};

export type Exercicio = {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  midia?: string | null; // url
  favorito?: boolean;
};
