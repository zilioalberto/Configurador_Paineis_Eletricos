import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/feedback'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from '../components/CargaForm'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { useUpdateCargaMutation } from '../hooks/useCargaMutations'
import { listarModelosCarga } from '../services/cargaService'
import type { CargaFormData, CargaModelo } from '../types/carga'
import { applyTipoChange } from '../utils/cargaFormDefaults'
import { cargaDetailToForm } from '../utils/cargaDetailToForm'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { projetoPermiteEdicaoCargas } from '../utils/projetoEdicaoCargas'

export default function CargaEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const loadErrorToastSent = useRef(false)

  const {
    data: carga,
    isPending: loadingCarga,
    isError: isLoadError,
    error: loadQueryError,
    refetch,
  } = useCargaDetailQuery(id)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()

  const updateMutation = useUpdateCargaMutation()
  const [formSeed, setFormSeed] = useState<CargaFormData | null>(null)
  const [formDraft, setFormDraft] = useState<CargaFormData | null>(null)
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('')
  const [modeloSelecionado, setModeloSelecionado] = useState<CargaModelo | null>(null)
  const [modeloBusca, setModeloBusca] = useState('')
  const [modeloBuscaDebounced, setModeloBuscaDebounced] = useState('')
  const [modeloDropdownAberto, setModeloDropdownAberto] = useState(false)
  const [modeloResultadoAtivo, setModeloResultadoAtivo] = useState(-1)
  const modeloBuscaWrapRef = useRef<HTMLDivElement>(null)
  const modeloBuscaId = useId()

  const initialData = useMemo(() => {
    if (!carga) return null
    return cargaDetailToForm(carga)
  }, [carga])

  useEffect(() => {
    if (!initialData) return
    setFormSeed(initialData)
    setFormDraft(initialData)
    setModeloSelecionadoId('')
    setModeloSelecionado(null)
    setModeloBusca('')
    setModeloBuscaDebounced('')
    setModeloDropdownAberto(false)
    setModeloResultadoAtivo(-1)
  }, [initialData])

  const projetoDaCarga = useMemo(
    () => (carga ? projetos.find((p) => p.id === carga.projeto) : undefined),
    [carga, projetos]
  )
  const edicaoBloqueada =
    carga != null && !projetoPermiteEdicaoCargas(projetoDaCarga)

  useEffect(() => {
    loadErrorToastSent.current = false
  }, [id])

  useEffect(() => {
    if (!isLoadError || !loadQueryError || loadErrorToastSent.current) return
    loadErrorToastSent.current = true
    showToast({
      variant: 'danger',
      title: 'Erro ao carregar carga',
      message:
        loadQueryError instanceof Error
          ? loadQueryError.message
          : 'Não foi possível carregar os dados.',
    })
  }, [isLoadError, loadQueryError, showToast])

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
    queryKey: ['cargas', 'modelos', 'edit', modeloBuscaDebounced],
    queryFn: () => listarModelosCarga({ q: modeloBuscaDebounced || undefined }),
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

  const aplicarModelo = useCallback(
    (modelo: CargaModelo) => {
      if (!formDraft) return
      const next = applyTipoChange(formDraft, modelo.tipo)
      const payload = modelo.payload as Record<string, unknown>
      if (typeof payload.quantidade === 'number') {
        next.quantidade = payload.quantidade
      }
      if (payload.motor && next.motor) next.motor = payload.motor as typeof next.motor
      if (payload.valvula && next.valvula) next.valvula = payload.valvula as typeof next.valvula
      if (payload.resistencia && next.resistencia) {
        next.resistencia = payload.resistencia as typeof next.resistencia
      }
      if (payload.sensor && next.sensor) next.sensor = payload.sensor as typeof next.sensor
      if (payload.transdutor && next.transdutor) {
        next.transdutor = payload.transdutor as typeof next.transdutor
      }
      next.descricao = modelo.nome
      setFormSeed({ ...next })
      setFormDraft(next)
      showToast({
        variant: 'success',
        message: `Modelo "${modelo.nome}" aplicado ao formulário.`,
      })
    },
    [formDraft, showToast]
  )

  const aplicarModeloSelecionado = useCallback(() => {
    if (!modeloSelecionado) return
    aplicarModelo(modeloSelecionado)
  }, [aplicarModelo, modeloSelecionado])

  async function handleSubmit(data: CargaFormData) {
    if (!id) return
    try {
      const updated = await updateMutation.mutateAsync({
        id,
        body: cargaFormToApiPayload(data),
      })
      showToast({ variant: 'success', message: 'Carga atualizada com sucesso.' })
      navigate(`/cargas?projeto=${encodeURIComponent(updated.projeto)}`)
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
        <h1 className="h3 mb-1">Editar carga</h1>
        <p className="text-muted mb-0">Altere os dados da carga selecionada.</p>
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Carga não informada.
            </div>
          )}

          {id && (loadingCarga || loadingProjetos) && (
            <p className="text-muted mb-0">Carregando...</p>
          )}

          {id && !loadingCarga && isLoadError && (
            <div className="d-flex flex-wrap align-items-center gap-3">
              <p className="text-danger mb-0">Não foi possível carregar esta carga.</p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => void refetch()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {id &&
            !loadingCarga &&
            !isLoadError &&
            initialData &&
            projetos.length > 0 &&
            edicaoBloqueada && (
              <div className="alert alert-secondary mb-0" role="alert">
                Esta carga pertence a um projeto finalizado e não pode ser alterada
                por aqui.{' '}
                <Link to={`/cargas/${id}`}>Voltar aos detalhes</Link>
                {' · '}
                <Link to="/cargas">Lista de cargas</Link>
              </div>
            )}

          {id &&
            !loadingCarga &&
            !isLoadError &&
            formSeed &&
            projetos.length > 0 &&
            !edicaoBloqueada && (
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
                        {modeloDropdownAberto &&
                        !modeloSelecionado &&
                        modeloBusca.trim().length >= 2 ? (
                          <ul
                            className="list-group position-absolute w-100 shadow-sm mt-1"
                            style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
                            role="listbox"
                          >
                            {loadingModelos ? (
                              <li className="list-group-item small text-muted">
                                Buscando modelos...
                              </li>
                            ) : modelos.length === 0 ? (
                              <li className="list-group-item small text-muted">
                                Nenhum modelo encontrado.
                              </li>
                            ) : (
                              modelos.map((modelo, index) => (
                                <li
                                  key={modelo.id}
                                  className="list-group-item list-group-item-action p-0"
                                >
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
                  key={id}
                  projetos={projetos}
                  initialData={formSeed}
                  onChange={setFormDraft}
                  onSubmit={handleSubmit}
                  loading={updateMutation.isPending}
                  lockProjeto
                />
              </>
            )}
        </div>
      </div>
    </div>
  )
}
