import {
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Link } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { rhApi } from '../services/rhApi'
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
} from '../types/rh'

type AbaRh = 'colaboradores' | 'departamentos' | 'cargos' | 'equipes' | 'jornadas'

type DeleteTarget = {
  tipo: AbaRh
  id: string
  label: string
}

type ColaboradorForm = {
  matricula: string
  nome: string
  email: string
  telefone: string
  documento: string
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
    documento: c.documento ?? '',
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
  return {
    matricula: form.matricula.trim(),
    nome: form.nome.trim(),
    email: form.email.trim(),
    telefone: form.telefone.trim(),
    documento: form.documento.replace(/\D/g, ''),
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
  const [departamentoForm, setDepartamentoForm] = useState<SimplesForm>(simplesVazio)
  const [cargoForm, setCargoForm] = useState<SimplesForm>(simplesVazio)
  const [equipeForm, setEquipeForm] = useState<EquipeForm>(equipeVazia)
  const [jornadaForm, setJornadaForm] = useState<JornadaForm>(jornadaVazia)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

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

  const listaAbaAtual = useMemo(() => {
    if (aba === 'colaboradores') return colaboradores
    if (aba === 'departamentos') return departamentos
    if (aba === 'cargos') return cargos
    if (aba === 'equipes') return equipes
    return jornadas
  }, [aba, cargos, colaboradores, departamentos, equipes, jornadas])

  function aplicarBusca(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBuscaAplicada(busca.trim())
  }

  function novoRegistro(tab: AbaRh = aba) {
    if (tab === 'colaboradores') {
      setColaboradorId(null)
      setColaboradorForm(colaboradorVazio)
    }
    if (tab === 'departamentos') {
      setDepartamentoId(null)
      setDepartamentoForm(simplesVazio)
    }
    if (tab === 'cargos') {
      setCargoId(null)
      setCargoForm(simplesVazio)
    }
    if (tab === 'equipes') {
      setEquipeId(null)
      setEquipeForm(equipeVazia)
    }
    if (tab === 'jornadas') {
      setJornadaId(null)
      setJornadaForm(jornadaVazia)
    }
  }

  function selecionarColaborador(item: ColaboradorDto) {
    setAba('colaboradores')
    setColaboradorId(item.id)
    setColaboradorForm(colaboradorParaForm(item))
  }

  function selecionarDepartamento(item: DepartamentoDto) {
    setAba('departamentos')
    setDepartamentoId(item.id)
    setDepartamentoForm(departamentoParaForm(item))
  }

  function selecionarCargo(item: CargoDto) {
    setAba('cargos')
    setCargoId(item.id)
    setCargoForm(cargoParaForm(item))
  }

  function selecionarEquipe(item: EquipeDto) {
    setAba('equipes')
    setEquipeId(item.id)
    setEquipeForm(equipeParaForm(item))
  }

  function selecionarJornada(item: JornadaTrabalhoDto) {
    setAba('jornadas')
    setJornadaId(item.id)
    setJornadaForm(jornadaParaForm(item))
  }

  async function salvarColaborador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canEdit || !colaboradorForm.matricula.trim() || !colaboradorForm.nome.trim()) return
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

  async function salvarDepartamento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  async function salvarCargo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  async function salvarEquipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  async function salvarJornada(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    if (!deleteTarget) return
    setConfirmandoDelete(true)
    try {
      if (deleteTarget.tipo === 'colaboradores') {
        await rhApi.excluirColaborador(deleteTarget.id)
        if (colaboradorId === deleteTarget.id) novoRegistro('colaboradores')
      }
      if (deleteTarget.tipo === 'departamentos') {
        await rhApi.excluirDepartamento(deleteTarget.id)
        if (departamentoId === deleteTarget.id) novoRegistro('departamentos')
      }
      if (deleteTarget.tipo === 'cargos') {
        await rhApi.excluirCargo(deleteTarget.id)
        if (cargoId === deleteTarget.id) novoRegistro('cargos')
      }
      if (deleteTarget.tipo === 'equipes') {
        await rhApi.excluirEquipe(deleteTarget.id)
        if (equipeId === deleteTarget.id) novoRegistro('equipes')
      }
      if (deleteTarget.tipo === 'jornadas') {
        await rhApi.excluirJornada(deleteTarget.id)
        if (jornadaId === deleteTarget.id) novoRegistro('jornadas')
      }
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
      return { ...state, dias_semana: dias.sort((a, b) => a - b) }
    })
  }

  return (
    <div className="container-fluid py-4">
      <ConfirmModal
        show={deleteTarget !== null}
        title="Excluir registro de RH"
        message={
          deleteTarget
            ? `Deseja excluir "${deleteTarget.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
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

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">RH</h1>
          <p className="text-muted mb-0">
            Colaboradores, cargos, departamentos, equipes e jornadas.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
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

      <div className="row g-4 align-items-start">
        <div className="col-xl-5">
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h5 mb-0">{abas.find((tab) => tab.id === aba)?.label}</h2>
                <span className="badge text-bg-light">{listaAbaAtual.length}</span>
              </div>

              {carregando ? (
                <p className="text-muted mb-0">Carregando…</p>
              ) : aba === 'colaboradores' ? (
                <ListaColaboradores
                  canEdit={canEdit}
                  colaboradores={colaboradores}
                  selectedId={colaboradorId}
                  onDelete={(item) =>
                    setDeleteTarget({ tipo: 'colaboradores', id: item.id, label: item.nome })
                  }
                  onSelect={selecionarColaborador}
                />
              ) : aba === 'departamentos' ? (
                <ListaSimples
                  canEdit={canEdit}
                  items={departamentos}
                  selectedId={departamentoId}
                  onDelete={(item) =>
                    setDeleteTarget({ tipo: 'departamentos', id: item.id, label: item.nome })
                  }
                  onSelect={selecionarDepartamento}
                  renderMeta={(item) => item.codigo || 'Sem código'}
                />
              ) : aba === 'cargos' ? (
                <ListaSimples
                  canEdit={canEdit}
                  items={cargos}
                  selectedId={cargoId}
                  onDelete={(item) =>
                    setDeleteTarget({ tipo: 'cargos', id: item.id, label: item.nome })
                  }
                  onSelect={selecionarCargo}
                  renderMeta={(item) => item.descricao || 'Sem descrição'}
                />
              ) : aba === 'equipes' ? (
                <ListaEquipes
                  canEdit={canEdit}
                  equipes={equipes}
                  selectedId={equipeId}
                  onDelete={(item) =>
                    setDeleteTarget({ tipo: 'equipes', id: item.id, label: item.nome })
                  }
                  onSelect={selecionarEquipe}
                />
              ) : (
                <ListaJornadas
                  canEdit={canEdit}
                  jornadas={jornadas}
                  selectedId={jornadaId}
                  onDelete={(item) =>
                    setDeleteTarget({ tipo: 'jornadas', id: item.id, label: item.nome })
                  }
                  onSelect={selecionarJornada}
                />
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card shadow-sm">
            <div className="card-body">
              {aba === 'colaboradores' ? (
                <FormColaborador
                  canEdit={canEdit}
                  cargos={cargos}
                  departamentos={departamentos}
                  equipes={equipes}
                  form={colaboradorForm}
                  isEditing={Boolean(colaboradorId)}
                  jornadas={jornadas}
                  salvando={salvando}
                  setForm={setColaboradorForm}
                  onSubmit={salvarColaborador}
                />
              ) : aba === 'departamentos' ? (
                <FormDepartamento
                  canEdit={canEdit}
                  form={departamentoForm}
                  isEditing={Boolean(departamentoId)}
                  salvando={salvando}
                  setForm={setDepartamentoForm}
                  onSubmit={salvarDepartamento}
                />
              ) : aba === 'cargos' ? (
                <FormCargo
                  canEdit={canEdit}
                  form={cargoForm}
                  isEditing={Boolean(cargoId)}
                  salvando={salvando}
                  setForm={setCargoForm}
                  onSubmit={salvarCargo}
                />
              ) : aba === 'equipes' ? (
                <FormEquipe
                  canEdit={canEdit}
                  colaboradores={colaboradores}
                  departamentos={departamentos}
                  form={equipeForm}
                  isEditing={Boolean(equipeId)}
                  salvando={salvando}
                  setForm={setEquipeForm}
                  onSubmit={salvarEquipe}
                />
              ) : (
                <FormJornada
                  canEdit={canEdit}
                  form={jornadaForm}
                  isEditing={Boolean(jornadaId)}
                  salvando={salvando}
                  setForm={setJornadaForm}
                  toggleDiaSemana={toggleDiaSemana}
                  onSubmit={salvarJornada}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListaColaboradores({
  canEdit,
  colaboradores,
  selectedId,
  onDelete,
  onSelect,
}: {
  canEdit: boolean
  colaboradores: ColaboradorDto[]
  selectedId: string | null
  onDelete: (item: ColaboradorDto) => void
  onSelect: (item: ColaboradorDto) => void
}) {
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
                {!item.ativo ? <span className="badge text-bg-secondary ms-2">Inativo</span> : null}
                {item.email ? <div className="small text-muted">{item.email}</div> : null}
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
}: {
  canEdit: boolean
  items: T[]
  selectedId: string | null
  renderMeta: (item: T) => string
  onDelete: (item: T) => void
  onSelect: (item: T) => void
}) {
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
                {!item.ativo ? <span className="badge text-bg-secondary ms-2">Inativo</span> : null}
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
}: {
  canEdit: boolean
  equipes: EquipeDto[]
  selectedId: string | null
  onDelete: (item: EquipeDto) => void
  onSelect: (item: EquipeDto) => void
}) {
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
}: {
  canEdit: boolean
  jornadas: JornadaTrabalhoDto[]
  selectedId: string | null
  onDelete: (item: JornadaTrabalhoDto) => void
  onSelect: (item: JornadaTrabalhoDto) => void
}) {
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
  departamentos,
  equipes,
  form,
  isEditing,
  jornadas,
  salvando,
  setForm,
  onSubmit,
}: {
  canEdit: boolean
  cargos: CargoDto[]
  departamentos: DepartamentoDto[]
  equipes: EquipeDto[]
  form: ColaboradorForm
  isEditing: boolean
  jornadas: JornadaTrabalhoDto[]
  salvando: boolean
  setForm: Dispatch<SetStateAction<ColaboradorForm>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="h5 mb-3">{isEditing ? 'Editar colaborador' : 'Novo colaborador'}</h2>
      <fieldset disabled={!canEdit || salvando}>
        <div className="row g-3">
          <TextField label="Matrícula" value={form.matricula} onChange={(v) => setForm((f) => ({ ...f, matricula: v }))} required />
          <TextField label="Nome" value={form.nome} onChange={(v) => setForm((f) => ({ ...f, nome: v }))} required wide />
          <TextField label="Email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} type="email" />
          <TextField label="Telefone" value={form.telefone} onChange={(v) => setForm((f) => ({ ...f, telefone: v }))} />
          <TextField label="Documento" value={form.documento} onChange={(v) => setForm((f) => ({ ...f, documento: v }))} />
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
}: {
  canEdit: boolean
  form: SimplesForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<SimplesForm>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
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
}: {
  canEdit: boolean
  form: SimplesForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<SimplesForm>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
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
}: {
  canEdit: boolean
  colaboradores: ColaboradorDto[]
  departamentos: DepartamentoDto[]
  form: EquipeForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<EquipeForm>>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
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
}: {
  canEdit: boolean
  form: JornadaForm
  isEditing: boolean
  salvando: boolean
  setForm: Dispatch<SetStateAction<JornadaForm>>
  toggleDiaSemana: (dia: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
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
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  required?: boolean
  wide?: boolean
}) {
  const id = `rh-field-${label.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <div className={wide ? 'col-md-8' : 'col-md-4'}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="form-control"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
      />
    </div>
  )
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
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
}: {
  label: string
  value: string
  children: ReactNode
  onChange: (value: string) => void
}) {
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
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
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
}: {
  canEdit: boolean
  disabled: boolean
  salvando: boolean
}) {
  if (!canEdit) return null
  return (
    <div className="d-flex flex-wrap gap-2 mt-3">
      <button type="submit" className="btn btn-primary" disabled={salvando || disabled}>
        {salvando ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  )
}
