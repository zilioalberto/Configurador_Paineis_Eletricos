import {
  type Dispatch,
  type ReactNode,
  type SyntheticEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import AppMasterDetailLayout from '@/components/layout/AppMasterDetailLayout'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { rhApi } from '../services/rhApi'
import { aplicarMascaraCpf, validarCpf } from '../utils/cpf'
import type {
  AtivoFiltroRh,
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
  UsuarioVinculoDto,
} from '../types/rh'

type AbaRh = 'colaboradores' | 'departamentos' | 'cargos' | 'equipes' | 'jornadas'

type DeleteTarget = {
  tipo: AbaRh
  id: string
  label: string
}

type ItemComNome = { id: string; nome: string }

function deleteTargetPorLista<T extends ItemComNome>(
  tipo: AbaRh,
  id: string | null,
  lista: T[]
): DeleteTarget | null {
  if (!id) return null
  const item = lista.find((row) => row.id === id)
  return item ? { tipo, id: item.id, label: item.nome } : null
}

type ColaboradorForm = {
  matricula: string
  nome: string
  email: string
  telefone: string
  documento: string
  usuario: string
  cargo: string
  departamento: string
  equipe: string
  jornada: string
  data_admissao: string
  data_demissao: string
  ativo: boolean
  observacoes: string
}

type SimplesForm = {
  nome: string
  codigo: string
  descricao: string
  ativo: boolean
}

type EquipeForm = {
  nome: string
  departamento: string
  lider: string
  descricao: string
  ativo: boolean
}

type JornadaForm = {
  nome: string
  carga_horaria_semanal: string
  hora_inicio: string
  hora_fim: string
  intervalo_inicio: string
  intervalo_fim: string
  dias_semana: number[]
  ativo: boolean
}

const abas: Array<{ id: AbaRh; label: string }> = [
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'departamentos', label: 'Departamentos' },
  { id: 'cargos', label: 'Cargos' },
  { id: 'equipes', label: 'Equipes' },
  { id: 'jornadas', label: 'Jornadas' },
]

const diasSemana = [
  { value: 0, label: 'Seg' },
  { value: 1, label: 'Ter' },
  { value: 2, label: 'Qua' },
  { value: 3, label: 'Qui' },
  { value: 4, label: 'Sex' },
  { value: 5, label: 'Sáb' },
  { value: 6, label: 'Dom' },
]

const colaboradorVazio: ColaboradorForm = {
  matricula: '',
  nome: '',
  email: '',
  telefone: '',
  documento: '',
  usuario: '',
  cargo: '',
  departamento: '',
  equipe: '',
  jornada: '',
  data_admissao: '',
  data_demissao: '',
  ativo: true,
  observacoes: '',
}

const simplesVazio: SimplesForm = {
  nome: '',
  codigo: '',
  descricao: '',
  ativo: true,
}

const equipeVazia: EquipeForm = {
  nome: '',
  departamento: '',
  lider: '',
  descricao: '',
  ativo: true,
}

const jornadaVazia: JornadaForm = {
  nome: '',
  carga_horaria_semanal: '44.00',
  hora_inicio: '08:00',
  hora_fim: '17:48',
  intervalo_inicio: '12:00',
  intervalo_fim: '13:00',
  dias_semana: [0, 1, 2, 3, 4],
  ativo: true,
}

function timeToInput(value: string | null | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

function inputToTime(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

function colaboradorParaForm(c: ColaboradorDto): ColaboradorForm {
  return {
    matricula: c.matricula ?? '',
    nome: c.nome ?? '',
    email: c.email ?? '',
    telefone: c.telefone ?? '',
    documento: c.documento ? aplicarMascaraCpf(c.documento) : '',
    usuario: c.usuario == null ? '' : String(c.usuario),
    cargo: c.cargo ?? '',
    departamento: c.departamento ?? '',
    equipe: c.equipe ?? '',
    jornada: c.jornada ?? '',
    data_admissao: c.data_admissao ?? '',
    data_demissao: c.data_demissao ?? '',
    ativo: Boolean(c.ativo),
    observacoes: c.observacoes ?? '',
  }
}

function departamentoParaForm(d: DepartamentoDto): SimplesForm {
  return {
    nome: d.nome ?? '',
    codigo: d.codigo ?? '',
    descricao: d.descricao ?? '',
    ativo: Boolean(d.ativo),
  }
}

function cargoParaForm(c: CargoDto): SimplesForm {
  return {
    nome: c.nome ?? '',
    codigo: '',
    descricao: c.descricao ?? '',
    ativo: Boolean(c.ativo),
  }
}

function equipeParaForm(e: EquipeDto): EquipeForm {
  return {
    nome: e.nome ?? '',
    departamento: e.departamento ?? '',
    lider: e.lider ?? '',
    descricao: e.descricao ?? '',
    ativo: Boolean(e.ativo),
  }
}

function jornadaParaForm(j: JornadaTrabalhoDto): JornadaForm {
  return {
    nome: j.nome ?? '',
    carga_horaria_semanal: String(j.carga_horaria_semanal ?? '44.00'),
    hora_inicio: timeToInput(j.hora_inicio),
    hora_fim: timeToInput(j.hora_fim),
    intervalo_inicio: timeToInput(j.intervalo_inicio),
    intervalo_fim: timeToInput(j.intervalo_fim),
    dias_semana: Array.isArray(j.dias_semana) ? j.dias_semana : [],
    ativo: Boolean(j.ativo),
  }
}

function colaboradorPayload(form: ColaboradorForm): ColaboradorPayload {
  const usuarioId = form.usuario.trim() ? Number.parseInt(form.usuario, 10) : null
  return {
    matricula: form.matricula.trim(),
    nome: form.nome.trim(),
    email: form.email.trim(),
    telefone: form.telefone.trim(),
    documento: form.documento.replace(/\D/g, ''),
    usuario: Number.isFinite(usuarioId) ? usuarioId : null,
    cargo: form.cargo || null,
    departamento: form.departamento || null,
    equipe: form.equipe || null,
    jornada: form.jornada || null,
    data_admissao: form.data_admissao || null,
    data_demissao: form.data_demissao || null,
    ativo: form.ativo,
    observacoes: form.observacoes.trim(),
  }
}

function departamentoPayload(form: SimplesForm): DepartamentoPayload {
  return {
    nome: form.nome.trim(),
    codigo: form.codigo.trim(),
    descricao: form.descricao.trim(),
    ativo: form.ativo,
  }
}

function cargoPayload(form: SimplesForm): CargoPayload {
  return {
    nome: form.nome.trim(),
    descricao: form.descricao.trim(),
    ativo: form.ativo,
  }
}

function equipePayload(form: EquipeForm): EquipePayload {
  return {
    nome: form.nome.trim(),
    departamento: form.departamento || null,
    lider: form.lider || null,
    descricao: form.descricao.trim(),
    ativo: form.ativo,
  }
}

function jornadaPayload(form: JornadaForm): JornadaTrabalhoPayload {
  return {
    nome: form.nome.trim(),
    carga_horaria_semanal: form.carga_horaria_semanal.trim() || '0',
    hora_inicio: inputToTime(form.hora_inicio),
    hora_fim: inputToTime(form.hora_fim),
    intervalo_inicio: inputToTime(form.intervalo_inicio),
    intervalo_fim: inputToTime(form.intervalo_fim),
    dias_semana: form.dias_semana,
    ativo: form.ativo,
  }
}

/** Página de gestão de RH (abas: colaboradores, departamentos, cargos, equipes, jornadas). */
export default function RhPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const canEdit = hasPermission(user, PERMISSION_KEYS.RH_EDITAR)

  const [aba, setAba] = useState<AbaRh>('colaboradores')
  const [ativoFiltro, setAtivoFiltro] = useState<AtivoFiltroRh>('1')
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [confirmandoDelete, setConfirmandoDelete] = useState(false)

  const [departamentos, setDepartamentos] = useState<DepartamentoDto[]>([])
  const [cargos, setCargos] = useState<CargoDto[]>([])
  const [jornadas, setJornadas] = useState<JornadaTrabalhoDto[]>([])
  const [equipes, setEquipes] = useState<EquipeDto[]>([])
  const [colaboradores, setColaboradores] = useState<ColaboradorDto[]>([])

  const [colaboradorId, setColaboradorId] = useState<string | null>(null)
  const [departamentoId, setDepartamentoId] = useState<string | null>(null)
  const [cargoId, setCargoId] = useState<string | null>(null)
  const [equipeId, setEquipeId] = useState<string | null>(null)
  const [jornadaId, setJornadaId] = useState<string | null>(null)

  const [colaboradorForm, setColaboradorForm] = useState<ColaboradorForm>(colaboradorVazio)
  const [cpfErro, setCpfErro] = useState<string | null>(null)
  const [departamentoForm, setDepartamentoForm] = useState<SimplesForm>(simplesVazio)
  const [cargoForm, setCargoForm] = useState<SimplesForm>(simplesVazio)
  const [equipeForm, setEquipeForm] = useState<EquipeForm>(equipeVazia)
  const [jornadaForm, setJornadaForm] = useState<JornadaForm>(jornadaVazia)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [usuariosVinculo, setUsuariosVinculo] = useState<UsuarioVinculoDto[]>([])
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  useEffect(() => {
    setMobileDetailOpen(false)
  }, [aba])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const filters = { ativo: ativoFiltro, search: buscaAplicada }
      const [
        departamentosResp,
        cargosResp,
        jornadasResp,
        equipesResp,
        colaboradoresResp,
      ] = await Promise.all([
        rhApi.listarDepartamentos(filters),
        rhApi.listarCargos(filters),
        rhApi.listarJornadas({ ativo: ativoFiltro }),
        rhApi.listarEquipes(filters),
        rhApi.listarColaboradores(filters),
      ])
      setDepartamentos(departamentosResp)
      setCargos(cargosResp)
      setJornadas(jornadasResp)
      setEquipes(equipesResp)
      setColaboradores(colaboradoresResp)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'RH',
        message: extrairMensagemErroApi(err) || 'Não foi possível carregar os cadastros de RH.',
      })
    } finally {
      setCarregando(false)
    }
  }, [ativoFiltro, buscaAplicada, showToast])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    if (!canEdit || aba !== 'colaboradores') {
      setUsuariosVinculo([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const list = await rhApi.listarUsuariosParaVinculo({
          colaborador: colaboradorId ?? undefined,
        })
        if (!cancelled) setUsuariosVinculo(list)
      } catch {
        if (!cancelled) setUsuariosVinculo([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [aba, canEdit, colaboradorId])

  const listaAbaAtual = useMemo(
    () => ({ colaboradores, departamentos, cargos, equipes, jornadas })[aba],
    [aba, cargos, colaboradores, departamentos, equipes, jornadas]
  )

  const exclusaoAlvoAtual = useMemo((): DeleteTarget | null => {
    const ids = {
      colaboradores: colaboradorId,
      departamentos: departamentoId,
      cargos: cargoId,
      equipes: equipeId,
      jornadas: jornadaId,
    }
    const listas: Record<AbaRh, ItemComNome[]> = {
      colaboradores,
      departamentos,
      cargos,
      equipes,
      jornadas,
    }
    return deleteTargetPorLista(aba, ids[aba], listas[aba])
  }, [
    aba,
    cargoId,
    cargos,
    colaboradorId,
    colaboradores,
    departamentoId,
    departamentos,
    equipeId,
    equipes,
    jornadaId,
    jornadas,
  ])

  const aplicarBusca: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  function novoRegistro(tab: AbaRh = aba) {
    const resets: Record<AbaRh, () => void> = {
      colaboradores: () => {
        setColaboradorId(null)
        setColaboradorForm(colaboradorVazio)
        setCpfErro(null)
      },
      departamentos: () => {
        setDepartamentoId(null)
        setDepartamentoForm(simplesVazio)
      },
      cargos: () => {
        setCargoId(null)
        setCargoForm(simplesVazio)
      },
      equipes: () => {
        setEquipeId(null)
        setEquipeForm(equipeVazia)
      },
      jornadas: () => {
        setJornadaId(null)
        setJornadaForm(jornadaVazia)
      },
    }
    resets[tab]()
    setMobileDetailOpen(true)
  }

  function selecionarColaborador(item: ColaboradorDto) {
    setAba('colaboradores')
    setColaboradorId(item.id)
    setColaboradorForm(colaboradorParaForm(item))
    setCpfErro(null)
    setMobileDetailOpen(true)
  }

  function selecionarDepartamento(item: DepartamentoDto) {
    setAba('departamentos')
    setDepartamentoId(item.id)
    setDepartamentoForm(departamentoParaForm(item))
    setMobileDetailOpen(true)
  }

  function selecionarCargo(item: CargoDto) {
    setAba('cargos')
    setCargoId(item.id)
    setCargoForm(cargoParaForm(item))
    setMobileDetailOpen(true)
  }

  function selecionarEquipe(item: EquipeDto) {
    setAba('equipes')
    setEquipeId(item.id)
    setEquipeForm(equipeParaForm(item))
    setMobileDetailOpen(true)
  }

  function selecionarJornada(item: JornadaTrabalhoDto) {
    setAba('jornadas')
    setJornadaId(item.id)
    setJornadaForm(jornadaParaForm(item))
    setMobileDetailOpen(true)
  }

  const salvarColaborador: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    void salvarColaboradorAsync()
  }

  async function salvarColaboradorAsync() {
    if (!canEdit || !colaboradorForm.matricula.trim() || !colaboradorForm.nome.trim()) return

    const erroCpf = validarCpf(colaboradorForm.documento)
    if (erroCpf) {
      setCpfErro(erroCpf)
      showToast({ variant: 'danger', title: 'Colaborador', message: erroCpf })
      return
    }
    setCpfErro(null)

    setSalvando(true)
    try {
      const payload = colaboradorPayload(colaboradorForm)
      const salvo = colaboradorId
        ? await rhApi.atualizarColaborador(colaboradorId, payload)
        : await rhApi.criarColaborador(payload)
      setColaboradorId(salvo.id)
      setColaboradorForm(colaboradorParaForm(salvo))
      await carregar()
      showToast({ variant: 'success', message: 'Colaborador salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Colaborador',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o colaborador.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const salvarDepartamento: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    void salvarDepartamentoAsync()
  }

  async function salvarDepartamentoAsync() {
    if (!canEdit || !departamentoForm.nome.trim()) return
    setSalvando(true)
    try {
      const payload = departamentoPayload(departamentoForm)
      const salvo = departamentoId
        ? await rhApi.atualizarDepartamento(departamentoId, payload)
        : await rhApi.criarDepartamento(payload)
      setDepartamentoId(salvo.id)
      setDepartamentoForm(departamentoParaForm(salvo))
      await carregar()
      showToast({ variant: 'success', message: 'Departamento salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Departamento',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o departamento.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const salvarCargo: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    void salvarCargoAsync()
  }

  async function salvarCargoAsync() {
    if (!canEdit || !cargoForm.nome.trim()) return
    setSalvando(true)
    try {
      const payload = cargoPayload(cargoForm)
      const salvo = cargoId
        ? await rhApi.atualizarCargo(cargoId, payload)
        : await rhApi.criarCargo(payload)
      setCargoId(salvo.id)
      setCargoForm(cargoParaForm(salvo))
      await carregar()
      showToast({ variant: 'success', message: 'Cargo salvo.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Cargo',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar o cargo.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const salvarEquipe: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    void salvarEquipeAsync()
  }

  async function salvarEquipeAsync() {
    if (!canEdit || !equipeForm.nome.trim()) return
    setSalvando(true)
    try {
      const payload = equipePayload(equipeForm)
      const salvo = equipeId
        ? await rhApi.atualizarEquipe(equipeId, payload)
        : await rhApi.criarEquipe(payload)
      setEquipeId(salvo.id)
      setEquipeForm(equipeParaForm(salvo))
      await carregar()
      showToast({ variant: 'success', message: 'Equipe salva.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Equipe',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar a equipe.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const salvarJornada: (event: SyntheticEvent<HTMLFormElement>) => void = (event) => {
    event.preventDefault()
    void salvarJornadaAsync()
  }

  async function salvarJornadaAsync() {
    if (!canEdit || !jornadaForm.nome.trim()) return
    setSalvando(true)
    try {
      const payload = jornadaPayload(jornadaForm)
      const salvo = jornadaId
        ? await rhApi.atualizarJornada(jornadaId, payload)
        : await rhApi.criarJornada(payload)
      setJornadaId(salvo.id)
      setJornadaForm(jornadaParaForm(salvo))
      await carregar()
      showToast({ variant: 'success', message: 'Jornada salva.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Jornada',
        message: extrairMensagemErroApi(err) || 'Não foi possível salvar a jornada.',
      })
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    const target = deleteTarget
    if (!target) return
    const exclusaoPorAba: Record<
      AbaRh,
      { remover: (id: string) => Promise<unknown>; selectedId: string | null }
    > = {
      colaboradores: {
        remover: (registroId) => rhApi.excluirColaborador(registroId),
        selectedId: colaboradorId,
      },
      departamentos: {
        remover: (registroId) => rhApi.excluirDepartamento(registroId),
        selectedId: departamentoId,
      },
      cargos: {
        remover: (registroId) => rhApi.excluirCargo(registroId),
        selectedId: cargoId,
      },
      equipes: {
        remover: (registroId) => rhApi.excluirEquipe(registroId),
        selectedId: equipeId,
      },
      jornadas: {
        remover: (registroId) => rhApi.excluirJornada(registroId),
        selectedId: jornadaId,
      },
    }
    setConfirmandoDelete(true)
    try {
      const action = exclusaoPorAba[target.tipo]
      await action.remover(target.id)
      if (action.selectedId === target.id) novoRegistro(target.tipo)
      setDeleteTarget(null)
      await carregar()
      showToast({ variant: 'success', message: 'Registro excluído.' })
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir',
        message: extrairMensagemErroApi(err) || 'Verifique vínculos existentes.',
      })
    } finally {
      setConfirmandoDelete(false)
    }
  }

  function toggleDiaSemana(dia: number) {
    setJornadaForm((state) => {
      const exists = state.dias_semana.includes(dia)
      const dias = exists
        ? state.dias_semana.filter((item) => item !== dia)
        : [...state.dias_semana, dia]
      return { ...state, dias_semana: dias.toSorted((a, b) => a - b) }
    })
  }

  const mensagemExclusao = deleteTarget
    ? `Deseja excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
    : ''

  return (
    <div className="container-fluid py-4">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir registro de RH"
        message={mensagemExclusao}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={confirmandoDelete}
        onCancel={() => {
          if (!confirmandoDelete) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmarExclusao()}
      />

      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Módulos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            RH
          </li>
        </ol>
      </nav>

      <div className="app-page-header d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">RH</h1>
          <p className="text-muted mb-0">
            Colaboradores, cargos, departamentos, equipes e jornadas.
          </p>
        </div>
        <div className="app-page-header__actions d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => void carregar()}
            disabled={carregando}
          >
            Atualizar
          </button>
          {canEdit ? (
            <button type="button" className="btn btn-primary" onClick={() => novoRegistro()}>
              Novo registro
            </button>
          ) : null}
        </div>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <form className="row g-2 align-items-end" onSubmit={aplicarBusca}>
            <div className="col-lg-6">
              <label className="form-label" htmlFor="rh-busca">
                Buscar
              </label>
              <input
                id="rh-busca"
                className="form-control"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, matrícula, email, cargo ou departamento"
              />
            </div>
            <div className="col-sm-4 col-lg-3">
              <label className="form-label" htmlFor="rh-ativo">
                Situação
              </label>
              <select
                id="rh-ativo"
                className="form-select"
                value={ativoFiltro}
                onChange={(e) => setAtivoFiltro(e.target.value as AtivoFiltroRh)}
              >
                <option value="">Todos</option>
                <option value="1">Ativos</option>
                <option value="0">Inativos</option>
              </select>
            </div>
            <div className="col-sm-8 col-lg-3 d-flex gap-2">
              <button type="submit" className="btn btn-outline-primary">
                Buscar
              </button>
              {buscaAplicada ? (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setBusca('')
                    setBuscaAplicada('')
                  }}
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {abas.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button
              type="button"
              className={`nav-link${aba === tab.id ? ' active' : ''}`}
              onClick={() => setAba(tab.id)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <AppMasterDetailLayout
        showDetail={mobileDetailOpen}
        onBackToList={() => setMobileDetailOpen(false)}
        list={
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h5 mb-0">{abas.find((tab) => tab.id === aba)?.label}</h2>
                <span className="badge text-bg-light">{listaAbaAtual.length}</span>
              </div>

              <RhListaAtual
                aba={aba}
                canEdit={canEdit}
                cargos={cargos}
                cargoId={cargoId}
                carregando={carregando}
                colaboradores={colaboradores}
                colaboradorId={colaboradorId}
                departamentos={departamentos}
                departamentoId={departamentoId}
                equipes={equipes}
                equipeId={equipeId}
                jornadas={jornadas}
                jornadaId={jornadaId}
                onDelete={setDeleteTarget}
                onSelectCargo={selecionarCargo}
                onSelectColaborador={selecionarColaborador}
                onSelectDepartamento={selecionarDepartamento}
                onSelectEquipe={selecionarEquipe}
                onSelectJornada={selecionarJornada}
              />
            </div>
          </div>
        }
        detail={
          <div className="card shadow-sm">
            <div className="card-body">
              {exclusaoAlvoAtual && canEdit ? (
                <div className="d-flex justify-content-end mb-3">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setDeleteTarget(exclusaoAlvoAtual)}
                  >
                    Excluir
                  </button>
                </div>
              ) : null}
              <RhFormularioAtual
                aba={aba}
                canEdit={canEdit}
                cargos={cargos}
                cargoForm={cargoForm}
                cargoId={cargoId}
                colaboradores={colaboradores}
                colaboradorForm={colaboradorForm}
                colaboradorId={colaboradorId}
                cpfErro={cpfErro}
                departamentoForm={departamentoForm}
                departamentoId={departamentoId}
                departamentos={departamentos}
                equipeForm={equipeForm}
                equipeId={equipeId}
                equipes={equipes}
                jornadaForm={jornadaForm}
                jornadaId={jornadaId}
                jornadas={jornadas}
                salvando={salvando}
                setCargoForm={setCargoForm}
                setColaboradorForm={setColaboradorForm}
                setCpfErro={setCpfErro}
                setDepartamentoForm={setDepartamentoForm}
                setEquipeForm={setEquipeForm}
                setJornadaForm={setJornadaForm}
                toggleDiaSemana={toggleDiaSemana}
                usuariosVinculo={usuariosVinculo}
                onSubmitCargo={salvarCargo}
                onSubmitColaborador={salvarColaborador}
                onSubmitDepartamento={salvarDepartamento}
                onSubmitEquipe={salvarEquipe}
                onSubmitJornada={salvarJornada}
              />
            </div>
          </div>
        }
      />
    </div>
  )
}

function RhListaAtual({
  aba,
  canEdit,
  cargos,
  cargoId,
  carregando,
  colaboradores,
  colaboradorId,
  departamentos,
  departamentoId,
  equipes,
  equipeId,
  jornadas,
  jornadaId,
  onDelete,
  onSelectCargo,
  onSelectColaborador,
  onSelectDepartamento,
  onSelectEquipe,
  onSelectJornada,
}: Readonly<{
  aba: AbaRh
  canEdit: boolean
  cargos: CargoDto[]
  cargoId: string | null
  carregando: boolean
  colaboradores: ColaboradorDto[]
  colaboradorId: string | null
  departamentos: DepartamentoDto[]
  departamentoId: string | null
  equipes: EquipeDto[]
  equipeId: string | null
  jornadas: JornadaTrabalhoDto[]
  jornadaId: string | null
  onDelete: (target: DeleteTarget) => void
  onSelectCargo: (item: CargoDto) => void
  onSelectColaborador: (item: ColaboradorDto) => void
  onSelectDepartamento: (item: DepartamentoDto) => void
  onSelectEquipe: (item: EquipeDto) => void
  onSelectJornada: (item: JornadaTrabalhoDto) => void
}>) {
  if (carregando) return <p className="text-muted mb-0">Carregando…</p>

  switch (aba) {
    case 'colaboradores':
      return (
        <ListaColaboradores
          canEdit={canEdit}
          colaboradores={colaboradores}
          selectedId={colaboradorId}
          onDelete={(item) => onDelete({ tipo: 'colaboradores', id: item.id, label: item.nome })}
          onSelect={onSelectColaborador}
        />
      )
    case 'departamentos':
      return (
        <ListaSimples
          canEdit={canEdit}
          items={departamentos}
          selectedId={departamentoId}
          onDelete={(item) => onDelete({ tipo: 'departamentos', id: item.id, label: item.nome })}
          onSelect={onSelectDepartamento}
          renderMeta={(item) => item.codigo || 'Sem código'}
        />
      )
    case 'cargos':
      return (
        <ListaSimples
          canEdit={canEdit}
          items={cargos}
          selectedId={cargoId}
          onDelete={(item) => onDelete({ tipo: 'cargos', id: item.id, label: item.nome })}
          onSelect={onSelectCargo}
          renderMeta={(item) => item.descricao || 'Sem descrição'}
        />
      )
    case 'equipes':
      return (
        <ListaEquipes
          canEdit={canEdit}
          equipes={equipes}
          selectedId={equipeId}
          onDelete={(item) => onDelete({ tipo: 'equipes', id: item.id, label: item.nome })}
          onSelect={onSelectEquipe}
        />
      )
    case 'jornadas':
      return (
        <ListaJornadas
          canEdit={canEdit}
          jornadas={jornadas}
          selectedId={jornadaId}
          onDelete={(item) => onDelete({ tipo: 'jornadas', id: item.id, label: item.nome })}
          onSelect={onSelectJornada}
        />
      )
  }
}

function RhFormularioAtual({
  aba,
  canEdit,
  cargos,
  cargoForm,
  cargoId,
  colaboradores,
  colaboradorForm,
  colaboradorId,
  cpfErro,
  departamentoForm,
  departamentoId,
  departamentos,
  equipeForm,
  equipeId,
  equipes,
  jornadaForm,
  jornadaId,
  jornadas,
  salvando,
  setCargoForm,
  setColaboradorForm,
  setCpfErro,
  setDepartamentoForm,
  setEquipeForm,
  setJornadaForm,
  toggleDiaSemana,
  usuariosVinculo,
  onSubmitCargo,
  onSubmitColaborador,
  onSubmitDepartamento,
  onSubmitEquipe,
  onSubmitJornada,
}: Readonly<{
  aba: AbaRh
  canEdit: boolean
  cargos: CargoDto[]
  cargoForm: SimplesForm
  cargoId: string | null
  colaboradores: ColaboradorDto[]
  colaboradorForm: ColaboradorForm
  colaboradorId: string | null
  cpfErro: string | null
  departamentoForm: SimplesForm
  departamentoId: string | null
  departamentos: DepartamentoDto[]
  equipeForm: EquipeForm
  equipeId: string | null
  equipes: EquipeDto[]
  jornadaForm: JornadaForm
  jornadaId: string | null
  jornadas: JornadaTrabalhoDto[]
  salvando: boolean
  setCargoForm: Dispatch<SetStateAction<SimplesForm>>
  setColaboradorForm: Dispatch<SetStateAction<ColaboradorForm>>
  setCpfErro: Dispatch<SetStateAction<string | null>>
  setDepartamentoForm: Dispatch<SetStateAction<SimplesForm>>
  setEquipeForm: Dispatch<SetStateAction<EquipeForm>>
  setJornadaForm: Dispatch<SetStateAction<JornadaForm>>
  toggleDiaSemana: (dia: number) => void
  usuariosVinculo: UsuarioVinculoDto[]
  onSubmitCargo: (event: SyntheticEvent<HTMLFormElement>) => void
  onSubmitColaborador: (event: SyntheticEvent<HTMLFormElement>) => void
  onSubmitDepartamento: (event: SyntheticEvent<HTMLFormElement>) => void
  onSubmitEquipe: (event: SyntheticEvent<HTMLFormElement>) => void
  onSubmitJornada: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  switch (aba) {
    case 'colaboradores': {
      const usuarioVinculadoEmail = colaboradorId
        ? colaboradores.find((colaborador) => colaborador.id === colaboradorId)?.usuario_email?.trim() ?? ''
        : ''
      return (
        <FormColaborador
          canEdit={canEdit}
          cargos={cargos}
          cpfErro={cpfErro}
          departamentos={departamentos}
          equipes={equipes}
          form={colaboradorForm}
          isEditing={Boolean(colaboradorId)}
          jornadas={jornadas}
          usuarioVinculadoEmail={usuarioVinculadoEmail}
          usuariosVinculo={usuariosVinculo}
          salvando={salvando}
          setForm={setColaboradorForm}
          setCpfErro={setCpfErro}
          onSubmit={onSubmitColaborador}
        />
      )
    }
    case 'departamentos':
      return (
        <FormDepartamento
          canEdit={canEdit}
          form={departamentoForm}
          isEditing={Boolean(departamentoId)}
          salvando={salvando}
          setForm={setDepartamentoForm}
          onSubmit={onSubmitDepartamento}
        />
      )
    case 'cargos':
      return (
        <FormCargo
          canEdit={canEdit}
          form={cargoForm}
          isEditing={Boolean(cargoId)}
          salvando={salvando}
          setForm={setCargoForm}
          onSubmit={onSubmitCargo}
        />
      )
    case 'equipes':
      return (
        <FormEquipe
          canEdit={canEdit}
          colaboradores={colaboradores}
          departamentos={departamentos}
          form={equipeForm}
          isEditing={Boolean(equipeId)}
          salvando={salvando}
          setForm={setEquipeForm}
          onSubmit={onSubmitEquipe}
        />
      )
    case 'jornadas':
      return (
        <FormJornada
          canEdit={canEdit}
          form={jornadaForm}
          isEditing={Boolean(jornadaId)}
          salvando={salvando}
          setForm={setJornadaForm}
          toggleDiaSemana={toggleDiaSemana}
          onSubmit={onSubmitJornada}
        />
      )
  }
}

function ListaColaboradores({
  canEdit,
  colaboradores,
  selectedId,
  onDelete,
  onSelect,
}: Readonly<{
  canEdit: boolean
  colaboradores: ColaboradorDto[]
  selectedId: string | null
  onDelete: (item: ColaboradorDto) => void
  onSelect: (item: ColaboradorDto) => void
}>) {
  if (colaboradores.length === 0) return <p className="text-muted mb-0">Nenhum colaborador.</p>
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Matrícula</th>
            <th>Alocação</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {colaboradores.map((item) => (
            <tr key={item.id} className={selectedId === item.id ? 'table-active' : ''}>
              <td>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start align-baseline"
                  onClick={() => onSelect(item)}
                >
                  {item.nome}
                </button>
                {item.ativo ? null : <span className="badge text-bg-secondary ms-2">Inativo</span>}
                {item.email ? <div className="small text-muted">{item.email}</div> : null}
                {item.usuario ? (
                  <div className="small text-success">Conta: {item.usuario_email || `#${item.usuario}`}</div>
                ) : null}
              </td>
              <td>{item.matricula}</td>
              <td>
                <div>{item.cargo_nome || 'Sem cargo'}</div>
                <div className="small text-muted">
                  {[item.departamento_nome, item.equipe_nome].filter(Boolean).join(' · ') || 'Sem área'}
                </div>
              </td>
              <td className="text-end">
                <div className="btn-group btn-group-sm">
                  <button type="button" className="btn btn-outline-primary" onClick={() => onSelect(item)}>
                    Abrir
                  </button>
                  {canEdit ? (
                    <button type="button" className="btn btn-outline-danger" onClick={() => onDelete(item)}>
                      Excluir
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListaSimples<T extends { id: string; nome: string; ativo: boolean }>({
  canEdit,
  items,
  selectedId,
  renderMeta,
  onDelete,
  onSelect,
}: Readonly<{
  canEdit: boolean
  items: T[]
  selectedId: string | null
  renderMeta: (item: T) => string
  onDelete: (item: T) => void
  onSelect: (item: T) => void
}>) {
  if (items.length === 0) return <p className="text-muted mb-0">Nenhum registro.</p>
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Detalhe</th>
            <th aria-label="Ações" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={selectedId === item.id ? 'table-active' : ''}>
              <td>
                <button
                  type="button"
                  className="btn btn-link p-0 text-start align-baseline"
                  onClick={() => onSelect(item)}
                >
                  {item.nome}
                </button>
                {item.ativo ? null : <span className="badge text-bg-secondary ms-2">Inativo</span>}
              </td>
              <td>{renderMeta(item)}</td>
              <td className="text-end">
                <div className="btn-group btn-group-sm">
                  <button type="button" className="btn btn-outline-primary" onClick={() => onSelect(item)}>
                    Abrir
                  </button>
                  {canEdit ? (
                    <button type="button" className="btn btn-outline-danger" onClick={() => onDelete(item)}>
                      Excluir
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListaEquipes({
  canEdit,
  equipes,
  selectedId,
  onDelete,
  onSelect,
}: Readonly<{
  canEdit: boolean
  equipes: EquipeDto[]
  selectedId: string | null
  onDelete: (item: EquipeDto) => void
  onSelect: (item: EquipeDto) => void
}>) {
  if (equipes.length === 0) return <p className="text-muted mb-0">Nenhuma equipe.</p>
  return (
    <ListaSimples
      canEdit={canEdit}
      items={equipes}
      selectedId={selectedId}
      onDelete={onDelete}
      onSelect={onSelect}
      renderMeta={(item) =>
        [item.departamento_nome || 'Sem departamento', item.lider_nome || 'Sem líder'].join(' · ')
      }
    />
  )
}

function ListaJornadas({
  canEdit,
  jornadas,
  selectedId,
  onDelete,
  onSelect,
}: Readonly<{
  canEdit: boolean
  jornadas: JornadaTrabalhoDto[]
  selectedId: string | null
  onDelete: (item: JornadaTrabalhoDto) => void
  onSelect: (item: JornadaTrabalhoDto) => void
}>) {
  if (jornadas.length === 0) return <p className="text-muted mb-0">Nenhuma jornada.</p>
  return (
    <ListaSimples
      canEdit={canEdit}
      items={jornadas}
      selectedId={selectedId}
      onDelete={onDelete}
      onSelect={onSelect}
      renderMeta={(item) => `${item.carga_horaria_semanal}h semanais`}
    />
  )
}

function FormColaborador({
  canEdit,
  cargos,
  cpfErro,
  departamentos,
  equipes,
  form,
  isEditing,
  jornadas,
  usuarioVinculadoEmail,
  usuariosVinculo,
  salvando,
  setForm,
  setCpfErro,
  onSubmit,
}: Readonly<{
  canEdit: boolean
  cargos: CargoDto[]
  cpfErro: string | null
  departamentos: DepartamentoDto[]
  equipes: EquipeDto[]
  form: ColaboradorForm
  isEditing: boolean
  jornadas: JornadaTrabalhoDto[]
  usuarioVinculadoEmail: string
  usuariosVinculo: UsuarioVinculoDto[]
  salvando: boolean
  setForm: Dispatch<SetStateAction<ColaboradorForm>>
  setCpfErro: Dispatch<SetStateAction<string | null>>
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar colaborador' : 'Novo colaborador'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Matrícula" value={form.matricula} onChange={(v) => setForm((f) => ({ ...f, matricula: v }))} required />
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          {canEdit ? (
            <>
              <SelectField
                label="Utilizador (conta de acesso)"
                value={form.usuario}
                onChange={(v) => setForm((f) => ({ ...f, usuario: v }))}
              >
                <option value="">Sem vínculo</option>
                {usuariosVinculo.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.nome ? `${u.nome} — ${u.email}` : u.email}
                  </option>
                ))}
              </SelectField>
              <div className="col-md-8">
                <p className="text-muted small mb-0">
                  Associe o registo de RH à conta com que a pessoa inicia sessão. Só são listados
                  utilizadores ativos ainda não ligados a outro colaborador.
                </p>
              </div>
            </>
          ) : (
            <div className="col-12 col-md-8">
              <span className="form-label d-block">Utilizador (conta de acesso)</span>
              <p className="mb-0">{usuarioVinculadoEmail || 'Nenhum utilizador vinculado.'}</p>
            </div>
          )}
          <TextField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
          <TextField label="Telefone" value={form.telefone} onChange={(v) => setForm((f) => ({ ...f, telefone: v }))} />
          <TextField
            label="CPF"
            value={form.documento}
            error={cpfErro}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            onChange={(v) => {
              setCpfErro(null)
              setForm((f) => ({ ...f, documento: aplicarMascaraCpf(v) }))
            }}
          />
          <div className="col-md-8">
            <p className="text-muted small mb-0">
              Usado para vincular holerites importados quando o nome do PDF não bater com o cadastro.
            </p>
          </div>
          <SelectField label="Cargo" value={form.cargo} onChange={(v) => setForm((f) => ({ ...f, cargo: v }))}>
            <option value="">Sem cargo</option>
            {cargos.map((cargo) => (
              <option key={cargo.id} value={cargo.id}>{cargo.nome}</option>
            ))}
          </SelectField>
          <SelectField label="Departamento" value={form.departamento} onChange={(v) => setForm((f) => ({ ...f, departamento: v }))}>
            <option value="">Sem departamento</option>
            {departamentos.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>{departamento.nome}</option>
            ))}
          </SelectField>
          <SelectField label="Equipe" value={form.equipe} onChange={(v) => setForm((f) => ({ ...f, equipe: v }))}>
            <option value="">Sem equipe</option>
            {equipes.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>
            ))}
          </SelectField>
          <SelectField label="Jornada" value={form.jornada} onChange={(v) => setForm((f) => ({ ...f, jornada: v }))}>
            <option value="">Sem jornada</option>
            {jornadas.map((jornada) => (
              <option key={jornada.id} value={jornada.id}>{jornada.nome}</option>
            ))}
          </SelectField>
          <TextField label="Admissão" value={form.data_admissao} onChange={(v) => setForm((f) => ({ ...f, data_admissao: v }))} type="date" />
          <TextField label="Demissão" value={form.data_demissao} onChange={(v) => setForm((f) => ({ ...f, data_demissao: v }))} type="date" />
          <div className="col-12">
            <label className="form-label" htmlFor="rh-col-observacoes">Observações</label>
            <textarea
              id="rh-col-observacoes"
              className="form-control"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
            />
          </div>
          <AtivoCheck checked={form.ativo} onChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </fieldset>
      <SubmitBar canEdit={canEdit} disabled={!form.matricula.trim() || !form.nome.trim()} salvando={salvando} />
    </form>
  )
}

function FormDepartamento({
  canEdit,
  form,
  isEditing,
  salvando,
  setForm,
  onSubmit,
}: Readonly<{
  canEdit: boolean
  form: SimplesForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<SimplesForm>>
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar departamento' : 'Novo departamento'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          <TextField label="Código" value={form.codigo} onChange={(v) => setForm((f) => ({ ...f, codigo: v }))} />
          <TextArea label="Descrição" value={form.descricao} onChange={(v) => setForm((f) => ({ ...f, descricao: v }))} />
          <AtivoCheck checked={form.ativo} onChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </fieldset>
      <SubmitBar canEdit={canEdit} disabled={!form.nome.trim()} salvando={salvando} />
    </form>
  )
}

function FormCargo({
  canEdit,
  form,
  isEditing,
  salvando,
  setForm,
  onSubmit,
}: Readonly<{
  canEdit: boolean
  form: SimplesForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<SimplesForm>>
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar cargo' : 'Novo cargo'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          <TextArea label="Descrição" value={form.descricao} onChange={(v) => setForm((f) => ({ ...f, descricao: v }))} />
          <AtivoCheck checked={form.ativo} onChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </fieldset>
      <SubmitBar canEdit={canEdit} disabled={!form.nome.trim()} salvando={salvando} />
    </form>
  )
}

function FormEquipe({
  canEdit,
  colaboradores,
  departamentos,
  form,
  isEditing,
  salvando,
  setForm,
  onSubmit,
}: Readonly<{
  canEdit: boolean
  colaboradores: ColaboradorDto[]
  departamentos: DepartamentoDto[]
  form: EquipeForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<EquipeForm>>
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar equipe' : 'Nova equipe'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          <SelectField label="Departamento" value={form.departamento} onChange={(v) => setForm((f) => ({ ...f, departamento: v }))}>
            <option value="">Sem departamento</option>
            {departamentos.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>{departamento.nome}</option>
            ))}
          </SelectField>
          <SelectField label="Líder" value={form.lider} onChange={(v) => setForm((f) => ({ ...f, lider: v }))}>
            <option value="">Sem líder</option>
            {colaboradores.map((colaborador) => (
              <option key={colaborador.id} value={colaborador.id}>{colaborador.nome}</option>
            ))}
          </SelectField>
          <TextArea label="Descrição" value={form.descricao} onChange={(v) => setForm((f) => ({ ...f, descricao: v }))} />
          <AtivoCheck checked={form.ativo} onChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </fieldset>
      <SubmitBar canEdit={canEdit} disabled={!form.nome.trim()} salvando={salvando} />
    </form>
  )
}

function FormJornada({
  canEdit,
  form,
  isEditing,
  salvando,
  setForm,
  toggleDiaSemana,
  onSubmit,
}: Readonly<{
  canEdit: boolean
  form: JornadaForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<JornadaForm>>
  toggleDiaSemana: (dia: number) => void
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
}>) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar jornada' : 'Nova jornada'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          <TextField label="Horas semanais" value={form.carga_horaria_semanal} onChange={(v) => setForm((f) => ({ ...f, carga_horaria_semanal: v }))} type="number" />
          <TextField label="Início" value={form.hora_inicio} onChange={(v) => setForm((f) => ({ ...f, hora_inicio: v }))} type="time" />
          <TextField label="Fim" value={form.hora_fim} onChange={(v) => setForm((f) => ({ ...f, hora_fim: v }))} type="time" />
          <TextField label="Início intervalo" value={form.intervalo_inicio} onChange={(v) => setForm((f) => ({ ...f, intervalo_inicio: v }))} type="time" />
          <TextField label="Fim intervalo" value={form.intervalo_fim} onChange={(v) => setForm((f) => ({ ...f, intervalo_fim: v }))} type="time" />
          <div className="col-12">
            <span className="form-label d-block">Dias da semana</span>
            <div className="d-flex flex-wrap gap-3">
              {diasSemana.map((dia) => (
                <div className="form-check" key={dia.value}>
                  <input
                    id={`rh-dia-${dia.value}`}
                    className="form-check-input"
                    type="checkbox"
                    checked={form.dias_semana.includes(dia.value)}
                    onChange={() => toggleDiaSemana(dia.value)}
                  />
                  <label className="form-check-label" htmlFor={`rh-dia-${dia.value}`}>
                    {dia.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <AtivoCheck checked={form.ativo} onChange={(ativo) => setForm((f) => ({ ...f, ativo }))} />
        </div>
      </fieldset>
      <SubmitBar canEdit={canEdit} disabled={!form.nome.trim()} salvando={salvando} />
    </form>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  wide = false,
  error = null,
  inputMode,
  autoComplete,
  placeholder,
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  wide?: boolean
  error?: string | null
  inputMode?: 'numeric' | 'text' | 'email' | 'tel'
  autoComplete?: string
  placeholder?: string
}>) {
  const id = `rh-field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className={wide ? 'col-md-8' : 'col-md-4'}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`form-control${error ? ' is-invalid' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      {error ? <div className="invalid-feedback d-block">{error}</div> : null}
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
}>) {
  const id = `rh-field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="col-12">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  children,
  onChange,
}: Readonly<{
  label: string
  value: string
  children: ReactNode
  onChange: (value: string) => void
}>) {
  const id = `rh-field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className="col-md-4">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </div>
  )
}

function AtivoCheck({
  checked,
  onChange,
}: Readonly<{
  checked: boolean
  onChange: (checked: boolean) => void
}>) {
  return (
    <div className="col-12">
      <div className="form-check">
        <input
          id="rh-field-ativo"
          className="form-check-input"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label className="form-check-label" htmlFor="rh-field-ativo">
          Ativo
        </label>
      </div>
    </div>
  )
}

function SubmitBar({
  canEdit,
  disabled,
  salvando,
}: Readonly<{
  canEdit: boolean
  disabled: boolean
  salvando: boolean
}>) {
  if (!canEdit) return null
  return (
    <div className="d-flex flex-wrap gap-2 mt-3">
      <button type="submit" className="btn btn-primary" disabled={salvando || disabled}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
