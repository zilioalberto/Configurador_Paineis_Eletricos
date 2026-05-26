/** Busca typeahead de modelos salvos para pré-preencher o formulário de carga. */

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useListboxKeyboardNavigation } from '@/hooks/useListboxKeyboardNavigation'
import { listarModelosCarga } from '../services/cargaService'
import type { CargaModelo } from '../types/carga'

const EMPTY_MODELOS: CargaModelo[] = []

export type CargaModeloOpcionalSectionProps = {
  /** Segmento estável para `queryKey` dos modelos (evita cache partilhado entre criar/editar). */
  modeloQueryScope: string
  onAplicarModelo: (modelo: CargaModelo) => void
  /** Layout enxuto para modal de nova carga. */
  compact?: boolean
  /** Página de CRUD de modelos (preserva query do fluxo quando aplicável). */
  gerenciarModelosHref?: string
}

export default function CargaModeloOpcionalSection({
  modeloQueryScope,
  onAplicarModelo,
  compact = false,
  gerenciarModelosHref,
}: CargaModeloOpcionalSectionProps) {
  const [modeloBusca, setModeloBusca] = useState('')
  const [modeloBuscaDebounced, setModeloBuscaDebounced] = useState('')
  const [modeloDropdownAberto, setModeloDropdownAberto] = useState(false)
  const modeloBuscaWrapRef = useRef<HTMLDivElement>(null)
  const modeloListRef = useRef<HTMLUListElement>(null)
  const modeloBuscaId = useId()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setModeloBuscaDebounced(modeloBusca.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [modeloBusca])

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

  const modeloNavItems = loadingModelos ? EMPTY_MODELOS : modelos
  const modeloListaTecladoAtiva =
    Boolean(modeloDropdownAberto) && modeloNavItems.length > 0
  const {
    activeIndex: modeloResultadoAtivo,
    handleKeyDown: handleModeloListKeyDown,
  } = useListboxKeyboardNavigation(modeloNavItems, {
    isActive: modeloListaTecladoAtiva,
    resetKey: `${modeloBuscaDebounced}|${modelos.map((m) => m.id).join(',')}`,
  })

  useEffect(() => {
    if (modeloResultadoAtivo < 0 || !modeloListRef.current) return
    const el = modeloListRef.current.querySelector(
      `#${modeloBuscaId}-opt-${modeloResultadoAtivo}`,
    )
    el?.scrollIntoView({ block: 'nearest' })
  }, [modeloResultadoAtivo, modeloBuscaId])

  const onSelecionarModelo = useCallback(
    (modelo: CargaModelo) => {
      onAplicarModelo(modelo)
      setModeloDropdownAberto(false)
      setModeloBusca('')
      setModeloBuscaDebounced('')
    },
    [onAplicarModelo]
  )

  return (
    <div
      className={
        compact
          ? 'carga-modelo-picker mb-3'
          : 'border rounded p-3 mb-3 bg-light-subtle'
      }
    >
      {compact && gerenciarModelosHref ? (
        <div className="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-1">
          <label className="form-label mb-0" htmlFor={modeloBuscaId}>
            Modelo pré-cadastrado
          </label>
          <Link to={gerenciarModelosHref} className="small text-nowrap">
            Gerenciar modelos
          </Link>
        </div>
      ) : (
        <label className="form-label mb-1" htmlFor={modeloBuscaId}>
          {compact ? 'Modelo pré-cadastrado' : 'Modelos pré-cadastrados'}
        </label>
      )}
      {!compact && gerenciarModelosHref ? (
        <div className="mb-2">
          <Link to={gerenciarModelosHref} className="small">
            Gerenciar modelos
          </Link>
        </div>
      ) : null}
      <div ref={modeloBuscaWrapRef} className="position-relative">
        <div className="input-group input-group-sm">
          <input
            id={modeloBuscaId}
            type="search"
            className="form-control form-control-sm"
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
                  handleModeloListKeyDown(event, onSelecionarModelo, {
                    onEscape: () => setModeloDropdownAberto(false),
                  })
                }}
            placeholder={compact ? 'Buscar modelo…' : 'Filtrar ou abrir a lista para ver todos'}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
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
                ref={modeloListRef}
                id={`${modeloBuscaId}-listbox`}
                className="list-group position-absolute w-100 shadow-sm mt-1"
                style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
                role="listbox"
              >
                {loadingModelos ? (
                  <li className="list-group-item small text-muted">Carregando modelos...</li>
                ) : modelos.length === 0 ? (
                  <li className="list-group-item small">
                    <span className="text-muted">Nenhum modelo encontrado.</span>
                    {gerenciarModelosHref ? (
                      <>
                        {' '}
                        <Link to={gerenciarModelosHref}>Cadastrar ou editar</Link>
                      </>
                    ) : null}
                  </li>
                ) : (
                  modelos.map((modelo, index) => (
                    <li key={modelo.id} className="list-group-item list-group-item-action p-0">
                      <button
                        id={`${modeloBuscaId}-opt-${index}`}
                        type="button"
                        role="option"
                        aria-selected={index === modeloResultadoAtivo}
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
      {!compact ? (
        <p className="form-text mb-0 mt-1">
          Digite para filtrar ou use ▾ para abrir a lista. Ao escolher um item, o modelo é aplicado ao
          formulário.
        </p>
      ) : null}
    </div>
  )
}
