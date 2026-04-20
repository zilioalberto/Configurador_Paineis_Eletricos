import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from '../components/CargaForm'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useCreateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData, CargaModelo, TipoCarga } from '../types/carga'
import { listarModelosCarga } from '../services/cargaService'
import { cargaFormInitial } from '../utils/cargaFormDefaults'
import { aplicarModeloNoFormulario } from '../utils/cargaModelos'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { filtrarProjetosComEdicaoCargas } from '../utils/projetoEdicaoCargas'

export default function CargaCreatePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const projetoQuery = searchParams.get('projeto') ?? ''
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetosEditaveis = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)

  const createMutation = useCreateCargaMutation()
  const [formSeed, setFormSeed] = useState<CargaFormData>(() => cargaFormInitial(''))
  const [formDraft, setFormDraft] = useState<CargaFormData>(() => cargaFormInitial(''))
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('')
  const [modeloSelecionado, setModeloSelecionado] = useState<CargaModelo | null>(null)
  const [modeloBusca, setModeloBusca] = useState('')
  const [modeloBuscaDebounced, setModeloBuscaDebounced] = useState('')
  const [modeloDropdownAberto, setModeloDropdownAberto] = useState(false)
  const [modeloResultadoAtivo, setModeloResultadoAtivo] = useState(-1)
  const modeloBuscaWrapRef = useRef<HTMLDivElement>(null)
  const modeloBuscaId = useId()

  const initialData = useMemo(() => {
    const fromQuery =
      projetoQuery &&
      projetosEditaveis.some((p) => p.id === projetoQuery)
        ? projetoQuery
        : ''
    const pid = fromQuery || projetosEditaveis[0]?.id || ''
    return cargaFormInitial(pid)
  }, [projetoQuery, projetosEditaveis])

  useEffect(() => {
    setFormSeed(initialData)
    setFormDraft(initialData)
  }, [initialData])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setModeloBuscaDebounced(modeloBusca.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [modeloBusca])

  useEffect(() => {
    setModeloResultadoAtivo(-1)
  }, [modeloBuscaDebounced])

  const { data: modelos = [], isPending: loadingModelos } = useQuery({
    queryKey: ['cargas', 'modelos', modeloBuscaDebounced],
    queryFn: () =>
      listarModelosCarga({
        q: modeloBuscaDebounced || undefined,
      }),
    enabled: modeloSelecionadoId === '' && modeloBuscaDebounced.length >= 2,
  })

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      const wrap = modeloBuscaWrapRef.current
      if (!wrap || !(event.target instanceof Node) || wrap.contains(event.target)) return
      setModeloDropdownAberto(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const { data: cargasProjetoAtual = [] } = useCargaListQuery(formDraft.projeto || null)

  const proximoTagSugerido = useMemo(() => {
    const PREFIX_BY_TIPO: Record<TipoCarga, string> = {
      MOTOR: 'M',
      VALVULA: 'V',
      RESISTENCIA: 'R',
      SENSOR: 'S',
      TRANSDUTOR: 'T',
      TRANSMISSOR: 'TM',
      OUTRO: 'O',
    }
    const prefix = PREFIX_BY_TIPO[formDraft.tipo]
    if (!prefix) return ''
    const matcher = new RegExp(`^${prefix}(\\d+)$`, 'i')
    const maxSeq = cargasProjetoAtual.reduce((acc, carga) => {
      const match = matcher.exec(carga.tag.trim())
      if (!match) return acc
      const seq = Number(match[1])
      return Number.isFinite(seq) && seq > acc ? seq : acc
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
  }, [cargasProjetoAtual, formDraft.tipo])

  const aplicarModelo = useCallback(
    (modelo: CargaModelo) => {
      const projetoId = formSeed.projeto || initialData.projeto
      if (!projetoId) return
      const next = aplicarModeloNoFormulario(projetoId, modelo.tipo, modelo.payload)
      next.descricao = modelo.nome
      setFormSeed(next)
      setFormDraft(next)
      showToast({
        variant: 'success',
        message: `Modelo "${modelo.nome}" aplicado ao formulário.`,
      })
    },
    [formSeed.projeto, initialData.projeto, showToast]
  )

  function aplicarModeloSelecionado() {
    if (!modeloSelecionado) return
    aplicarModelo(modeloSelecionado)
  }

  const onSelecionarModelo = useCallback((modelo: CargaModelo) => {
    setModeloSelecionadoId(modelo.id)
    setModeloSelecionado(modelo)
    setModeloDropdownAberto(false)
    setModeloBusca('')
    setModeloBuscaDebounced('')
    setModeloResultadoAtivo(-1)
  }, [])

  const onLimparModeloSelecionado = useCallback(() => {
    setModeloSelecionadoId('')
    setModeloSelecionado(null)
    setModeloBusca('')
    setModeloBuscaDebounced('')
    setModeloDropdownAberto(false)
    setModeloResultadoAtivo(-1)
  }, [])

  async function handleSubmit(data: CargaFormData) {
    if (!data.projeto) {
      showToast({
        variant: 'warning',
        message: 'Selecione o projeto ao qual a carga pertence.',
      })
      return
    }
    if (!projetosEditaveis.some((p) => p.id === data.projeto)) {
      showToast({
        variant: 'warning',
        message: 'Não é possível cadastrar cargas em projeto finalizado.',
      })
      return
    }
    try {
      const created = await createMutation.mutateAsync(cargaFormToApiPayload(data))
      showToast({ variant: 'success', message: 'Carga criada com sucesso.' })
      navigate(`/cargas?projeto=${encodeURIComponent(created.projeto)}`)
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: extrairMensagemErroApi(err) || 'Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-1">Nova carga</h1>
        <p className="text-muted mb-0">
          Informe o projeto e o tipo de carga. Os parâmetros específicos são preenchidos
          com valores padrão ao mudar o tipo (você pode ajustar antes de salvar).
        </p>
        <div className="mt-2">
          <Link to="/cargas/modelos" className="btn btn-sm btn-outline-secondary">
            Gerenciar modelos de carga
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loadingProjetos && (
            <p className="text-muted mb-0">Carregando projetos...</p>
          )}

          {!loadingProjetos && projetos.length === 0 && (
            <div className="alert alert-warning mb-0" role="alert">
              É necessário ter pelo menos um projeto cadastrado.{' '}
              {canCreateProjeto ? <Link to="/projetos/novo">Criar projeto</Link> : null}
            </div>
          )}

          {!loadingProjetos &&
            projetos.length > 0 &&
            projetosEditaveis.length === 0 && (
              <div className="alert alert-secondary mb-0" role="alert">
                Todos os projetos estão finalizados. Não é possível cadastrar novas
                cargas até existir um projeto em andamento.{' '}
                <Link to="/projetos">Ver projetos</Link>
              </div>
            )}

          {!loadingProjetos && projetosEditaveis.length > 0 && (
            <>
              <div className="border rounded p-3 mb-3 bg-light-subtle">
                <h2 className="h6 mb-3">Modelo de carga (opcional)</h2>
                <div className="row g-2 align-items-end">
                  <div className="col-md-10">
                    <label className="form-label" htmlFor={modeloBuscaId}>
                      Modelos pré-cadastrados
                    </label>
                    <div ref={modeloBuscaWrapRef} className="position-relative">
                      <input
                        id={modeloBuscaId}
                        type="search"
                        className="form-control"
                        value={
                          modeloSelecionado
                            ? `${modeloSelecionado.nome} (${modeloSelecionado.tipo})`
                            : modeloBusca
                        }
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          if (modeloSelecionado) return
                          setModeloBusca(event.target.value)
                          setModeloDropdownAberto(true)
                        }}
                        onFocus={() => {
                          if (!modeloSelecionado) setModeloDropdownAberto(true)
                        }}
                        onKeyDown={(event) => {
                          if (modeloSelecionado && event.key === 'Enter') {
                            event.preventDefault()
                            aplicarModeloSelecionado()
                            return
                          }
                          if (!modeloDropdownAberto && event.key === 'ArrowDown') {
                            setModeloDropdownAberto(true)
                            return
                          }
                          if (!modeloDropdownAberto || modelos.length === 0) return
                          if (event.key === 'ArrowDown') {
                            event.preventDefault()
                            setModeloResultadoAtivo((prev) =>
                              prev < modelos.length - 1 ? prev + 1 : 0
                            )
                            return
                          }
                          if (event.key === 'ArrowUp') {
                            event.preventDefault()
                            setModeloResultadoAtivo((prev) =>
                              prev > 0 ? prev - 1 : modelos.length - 1
                            )
                            return
                          }
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            const idx = modeloResultadoAtivo >= 0 ? modeloResultadoAtivo : 0
                            const escolhido = modelos[idx]
                            if (!escolhido) return
                            onSelecionarModelo(escolhido)
                            aplicarModelo(escolhido)
                            return
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault()
                            setModeloDropdownAberto(false)
                            setModeloResultadoAtivo(-1)
                          }
                        }}
                        placeholder="Digite ao menos 2 caracteres do modelo"
                        autoComplete="off"
                        disabled={Boolean(modeloSelecionado)}
                        readOnly={Boolean(modeloSelecionado)}
                      />
                      {modeloSelecionado ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary mt-2"
                          onClick={onLimparModeloSelecionado}
                        >
                          Trocar modelo
                        </button>
                      ) : null}

                      {modeloDropdownAberto && !modeloSelecionado && modeloBusca.trim().length >= 2 ? (
                        <ul
                          className="list-group position-absolute w-100 shadow-sm mt-1"
                          style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
                          role="listbox"
                        >
                          {loadingModelos ? (
                            <li className="list-group-item small text-muted">Buscando modelos...</li>
                          ) : modelos.length === 0 ? (
                            <li className="list-group-item small text-muted">
                              Nenhum modelo encontrado.
                            </li>
                          ) : (
                            modelos.map((modelo, index) => (
                              <li key={modelo.id} className="list-group-item list-group-item-action p-0">
                                <button
                                  type="button"
                                  className={`btn btn-link text-start text-decoration-none w-100 py-2 px-3 rounded-0 ${
                                    index === modeloResultadoAtivo ? 'bg-light' : ''
                                  }`}
                                  onClick={() => onSelecionarModelo(modelo)}
                                >
                                  <span className="fw-semibold me-2">{modelo.nome}</span>
                                  <span className="small text-muted">({modelo.tipo})</span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      ) : null}
                    </div>
                    {modeloBusca.trim().length > 0 && modeloBusca.trim().length < 2 ? (
                      <div className="form-text">Digite ao menos 2 caracteres para buscar.</div>
                    ) : null}
                  </div>
                  <div className="col-md-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary w-100"
                      disabled={!modeloSelecionado}
                      onClick={aplicarModeloSelecionado}
                    >
                      Aplicar modelo
                    </button>
                  </div>
                </div>
              </div>

              <CargaForm
                projetos={projetosEditaveis}
                initialData={formSeed}
                suggestedTag={proximoTagSugerido}
                onChange={setFormDraft}
                onSubmit={handleSubmit}
                loading={createMutation.isPending}
                lockProjeto={false}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
