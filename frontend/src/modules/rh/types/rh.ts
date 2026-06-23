/**
 * Tipos e payloads da API de RH (departamentos, cargos, equipes, jornadas, colaboradores).
 */

export type AtivoFiltroRh = '' | '1' | '0'

export type DepartamentoDto = {
  id: string
  nome: string
  codigo: string
  descricao: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type CargoDto = {
  id: string
  nome: string
  descricao: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type JornadaTrabalhoDto = {
  id: string
  nome: string
  carga_horaria_semanal: string
  hora_inicio: string | null
  hora_fim: string | null
  intervalo_inicio: string | null
  intervalo_fim: string | null
  dias_semana: number[]
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type EquipeDto = {
  id: string
  nome: string
  departamento: string | null
  departamento_nome: string
  lider: string | null
  lider_nome: string
  descricao: string
  ativo: boolean
  criado_em?: string
  atualizado_em?: string
}

export type ColaboradorDto = {
  id: string
  usuario: number | null
  usuario_email: string
  matricula: string
  nome: string
  email: string
  telefone: string
  /** CPF (11 dígitos; armazenado no campo `documento` da API). */
  documento: string
  cargo: string | null
  cargo_nome: string
  departamento: string | null
  departamento_nome: string
  equipe: string | null
  equipe_nome: string
  jornada: string | null
  jornada_nome: string
  data_admissao: string | null
  data_demissao: string | null
  ativo: boolean
  observacoes: string
  criado_em?: string
  atualizado_em?: string
}

export type DepartamentoPayload = {
  nome: string
  codigo?: string
  descricao?: string
  ativo: boolean
}

export type CargoPayload = {
  nome: string
  descricao?: string
  ativo: boolean
}

export type JornadaTrabalhoPayload = {
  nome: string
  carga_horaria_semanal: string | number
  hora_inicio?: string | null
  hora_fim?: string | null
  intervalo_inicio?: string | null
  intervalo_fim?: string | null
  dias_semana: number[]
  ativo: boolean
}

export type EquipePayload = {
  nome: string
  departamento?: string | null
  lider?: string | null
  descricao?: string
  ativo: boolean
}

/** Utilizadores disponíveis para vínculo no cadastro do colaborador (GET .../usuarios-vinculo/). */
export type UsuarioVinculoDto = {
  id: number
  email: string
  nome: string | null
}

export type ColaboradorPayload = {
  usuario?: number | null
  matricula: string
  nome: string
  email?: string
  telefone?: string
  documento?: string
  cargo?: string | null
  departamento?: string | null
  equipe?: string | null
  jornada?: string | null
  data_admissao?: string | null
  data_demissao?: string | null
  ativo: boolean
  observacoes?: string
}

export type RhListFilters = {
  ativo?: AtivoFiltroRh
  search?: string
  departamento?: string
  equipe?: string
  cargo?: string
}
