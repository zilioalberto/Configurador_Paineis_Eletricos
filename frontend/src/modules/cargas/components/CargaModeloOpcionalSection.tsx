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
      listarModelosCarga(
        modeloBuscaDebounced.trim()
          ? { q: modeloBuscaDebounced.trim() }
          : undefined
      ),
    enabled: modeloDropdownAberto,
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

  const onSelecionarModelo = useCallback(
    (modelo: CargaModelo) => {
      onAplicarModelo(modelo)
      setModeloDropdownAberto(false)
      setModeloBusca('')
      setModeloBuscaDebounced('')
      setModeloResultadoAtivo(-1)
    },
    [onAplicarModelo]
  )

  return (
    <div className="border rounded p-3 mb-3 bg-light-subtle">
      <h2 className="h6 mb-3">Modelo de carga (opcional)</h2>
      <div className="row g-2 align-items-end">
        <div className="col-12">
          <label className="form-label" htmlFor={modeloBuscaId}>
            Modelos pré-cadastrados
          </label>
          <div ref={modeloBuscaWrapRef} className="position-relative">
            <div className="input-group">
              <input
                id={modeloBuscaId}
                type="search"
                className="form-control"
                role="combobox"
                aria-expanded={modeloDropdownAberto}
                aria-autocomplete="list"
                aria-controls={`${modeloBuscaId}-listbox`}
                value={modeloBusca}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setModeloBusca(event.target.value)
                  setModeloDropdownAberto(true)
                }}
                onFocus={() => {
                  setModeloDropdownAberto(true)
                }}
                onKeyDown={(event) => {
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
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setModeloDropdownAberto(false)
                    setModeloResultadoAtivo(-1)
                  }
                }}
                placeholder="Filtrar ou abrir a lista para ver todos"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                title="Mostrar lista de modelos"
                aria-label="Mostrar lista de modelos"
                onClick={() => {
                  setModeloDropdownAberto((aberto) => !aberto)
                }}
              >
                <span aria-hidden>▾</span>
              </button>
            </div>

            {modeloDropdownAberto ? (
              <ul
                id={`${modeloBuscaId}-listbox`}
                className="list-group position-absolute w-100 shadow-sm mt-1"
                style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
                role="listbox"
              >
                {loadingModelos ? (
                  <li className="list-group-item small text-muted">Carregando modelos...</li>
                ) : modelos.length === 0 ? (
                  <li className="list-group-item small text-muted">Nenhum modelo encontrado.</li>
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
          <p className="form-text mb-0">
            Digite para filtrar no servidor ou use ▾ para abrir a lista. Ao escolher um item, o modelo
            é aplicado de imediato ao formulário; pode voltar a abrir a lista para selecionar outro.
          </p>
        </div>
      </div>
    </div>
  )
}
