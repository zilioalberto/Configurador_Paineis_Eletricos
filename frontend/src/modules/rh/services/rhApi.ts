/**
 * Cliente HTTP do módulo RH (CRUD de cadastros organizacionais).
 * Rota exposta em `/erp/rh` via `erp.registry`.
 */

import apiClient from '@/services/apiClient'
import type {
  CargoDto,
  CargoPayload,
  ColaboradorDto,
  ColaboradorPayload,
  DepartamentoDto,
  DepartamentoPayload,
  EquipeDto,
  EquipePayload,
  JornadaTrabalhoDto,
  JornadaTrabalhoPayload,
  RhListFilters,
  UsuarioVinculoDto,
} from '../types/rh'

const BASE = {
  departamentos: '/rh/departamentos/',
  cargos: '/rh/cargos/',
  jornadas: '/rh/jornadas/',
  equipes: '/rh/equipes/',
  colaboradores: '/rh/colaboradores/',
  usuariosVinculo: '/rh/colaboradores/usuarios-vinculo/',
} as const

function normalizeList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (
    data &&
    typeof data === 'object' &&
    'results' in data &&
    Array.isArray((data as { results: T[] }).results)
  ) {
    return (data as { results: T[] }).results
  }
  return []
}

function cleanParams(filters: RhListFilters = {}) {
  return {
    ...(filters.ativo ? { ativo: filters.ativo } : {}),
    ...(filters.search?.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.departamento ? { departamento: filters.departamento } : {}),
    ...(filters.equipe ? { equipe: filters.equipe } : {}),
    ...(filters.cargo ? { cargo: filters.cargo } : {}),
    page_size: 500,
  }
}

async function list<T>(url: string, filters?: RhListFilters): Promise<T[]> {
  const { data } = await apiClient.get<unknown>(url, { params: cleanParams(filters) })
  return normalizeList<T>(data)
}

async function create<T, P>(url: string, payload: P): Promise<T> {
  const { data } = await apiClient.post<T>(url, payload)
  return data
}

async function patch<T, P>(url: string, id: string, payload: Partial<P>): Promise<T> {
  const { data } = await apiClient.patch<T>(`${url}${id}/`, payload)
  return data
}

async function remove(url: string, id: string): Promise<void> {
  await apiClient.delete(`${url}${id}/`)
}

/** Facade com operações CRUD de todas as entidades de RH. */
export const rhApi = {
  listarDepartamentos: (filters?: RhListFilters) =>
    list<DepartamentoDto>(BASE.departamentos, filters),
  criarDepartamento: (payload: DepartamentoPayload) =>
    create<DepartamentoDto, DepartamentoPayload>(BASE.departamentos, payload),
  atualizarDepartamento: (id: string, payload: Partial<DepartamentoPayload>) =>
    patch<DepartamentoDto, DepartamentoPayload>(BASE.departamentos, id, payload),
  excluirDepartamento: (id: string) => remove(BASE.departamentos, id),

  listarCargos: (filters?: RhListFilters) => list<CargoDto>(BASE.cargos, filters),
  criarCargo: (payload: CargoPayload) => create<CargoDto, CargoPayload>(BASE.cargos, payload),
  atualizarCargo: (id: string, payload: Partial<CargoPayload>) =>
    patch<CargoDto, CargoPayload>(BASE.cargos, id, payload),
  excluirCargo: (id: string) => remove(BASE.cargos, id),

  listarJornadas: (filters?: RhListFilters) => list<JornadaTrabalhoDto>(BASE.jornadas, filters),
  criarJornada: (payload: JornadaTrabalhoPayload) =>
    create<JornadaTrabalhoDto, JornadaTrabalhoPayload>(BASE.jornadas, payload),
  atualizarJornada: (id: string, payload: Partial<JornadaTrabalhoPayload>) =>
    patch<JornadaTrabalhoDto, JornadaTrabalhoPayload>(BASE.jornadas, id, payload),
  excluirJornada: (id: string) => remove(BASE.jornadas, id),

  listarEquipes: (filters?: RhListFilters) => list<EquipeDto>(BASE.equipes, filters),
  criarEquipe: (payload: EquipePayload) =>
    create<EquipeDto, EquipePayload>(BASE.equipes, payload),
  atualizarEquipe: (id: string, payload: Partial<EquipePayload>) =>
    patch<EquipeDto, EquipePayload>(BASE.equipes, id, payload),
  excluirEquipe: (id: string) => remove(BASE.equipes, id),

  listarColaboradores: (filters?: RhListFilters) =>
    list<ColaboradorDto>(BASE.colaboradores, filters),
  criarColaborador: (payload: ColaboradorPayload) =>
    create<ColaboradorDto, ColaboradorPayload>(BASE.colaboradores, payload),
  atualizarColaborador: (id: string, payload: Partial<ColaboradorPayload>) =>
    patch<ColaboradorDto, ColaboradorPayload>(BASE.colaboradores, id, payload),
  excluirColaborador: (id: string) => remove(BASE.colaboradores, id),

  listarUsuariosParaVinculo: (params?: { colaborador?: string | null; search?: string }) =>
    apiClient
      .get<UsuarioVinculoDto[]>(BASE.usuariosVinculo, {
        params: {
          ...(params?.colaborador ? { colaborador: params.colaborador } : {}),
          ...(params?.search?.trim() ? { search: params.search.trim() } : {}),
        },
      })
      .then((r) => r.data),
}
