import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { listarModelosCarga } from '../services/cargaService'
import type { CargaModelo } from '../types/carga'

export type CargaModeloOpcionalSectionProps = {
  /** Segmento estável para `queryKey` dos modelos (evita cache partilhado entre criar/editar). */
  modeloQueryScope: string
  onAplicarModelo: (modelo: CargaModelo) => void
}

export default function CargaModeloOpcionalSection({
  modeloQueryScope,
  onAplicarModelo,
}: CargaModeloOpcionalSectionProps) {
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState('')
  const [modeloSelecionado, setModeloSelecionado] = useState<CargaModelo | null>(null)
  const [modeloBusca, setModeloBusca] = useState('')
  const [modeloBuscaDebounced, setModeloBuscaDebounced] = useState('')
  const [modeloDropdownAberto, setModeloDropdownAberto] = useState(false)
  const [modeloResultadoAtivo, setModeloResultadoAtivo] = useState(-1)
  const modeloBuscaWrapRef = useRef<HTMLDivElement>(null)
  const modeloBuscaId = useId()

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
    queryKey: ['cargas', 'modelos', modeloQueryScope, modeloBuscaDebounced],
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

  const aplicarModeloSelecionado = useCallback(() => {
    if (!modeloSelecionado) return
    onAplicarModelo(modeloSelecionado)
  }, [modeloSelecionado, onAplicarModelo])

  return (
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
                  onAplicarModelo(escolhido)
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
  )
}
