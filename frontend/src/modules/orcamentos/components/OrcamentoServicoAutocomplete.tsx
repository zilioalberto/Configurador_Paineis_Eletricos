import { useEffect, useId, useRef, useState } from 'react'

import type { ServicoListItem } from '@/modules/catalogo/types/servico'

import { useOrcamentoServicoBusca } from '../hooks/useOrcamentoServicoBusca'

type Props = Readonly<{
  value: string
  onValueChange: (value: string) => void
  onSelectServico: (servico: ServicoListItem) => void
  disabled?: boolean
  placeholder?: string
}>

export default function OrcamentoServicoAutocomplete({
  value,
  onValueChange,
  onSelectServico,
  disabled = false,
  placeholder = 'Código ou descrição do serviço...',
}: Props) {
  const { itens, carregando, aberto, setAberto, minChars } = useOrcamentoServicoBusca(value)
  const [indiceAtivo, setIndiceAtivo] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const listaVisivel = aberto && value.trim().length >= minChars
  const podeSelecionar = !carregando && itens.length > 0

  useEffect(() => {
    if (!listaVisivel || !podeSelecionar) {
      setIndiceAtivo(-1)
      return
    }
    setIndiceAtivo((atual) => (atual >= itens.length ? itens.length - 1 : atual))
  }, [itens.length, listaVisivel, podeSelecionar])

  function escolher(servico: ServicoListItem) {
    onSelectServico(servico)
    setAberto(false)
    setIndiceAtivo(-1)
    inputRef.current?.focus()
  }

  function moverIndice(delta: number) {
    if (!podeSelecionar) return
    setIndiceAtivo((atual) => {
      if (atual < 0) return delta > 0 ? 0 : itens.length - 1
      return (atual + delta + itens.length) % itens.length
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listaVisivel) {
      if (event.key === 'ArrowDown' && value.trim().length >= minChars) setAberto(true)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moverIndice(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moverIndice(-1)
    } else if (event.key === 'Enter') {
      if (podeSelecionar && indiceAtivo >= 0 && indiceAtivo < itens.length) {
        event.preventDefault()
        escolher(itens[indiceAtivo])
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setAberto(false)
      setIndiceAtivo(-1)
    }
  }

  return (
    <div className="position-relative">
      <input
        ref={inputRef}
        type="search"
        className="form-control form-control-sm"
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        role="combobox"
        aria-expanded={listaVisivel}
        aria-controls={listaVisivel ? listboxId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          onValueChange(e.target.value)
          setAberto(true)
          setIndiceAtivo(-1)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={onKeyDown}
      />
      {listaVisivel ? (
        <ul
          id={listboxId}
          role="listbox"
          className="list-group position-absolute w-100 shadow-sm mt-1"
          style={{ zIndex: 20, maxHeight: '14rem', overflowY: 'auto' }}
        >
          {carregando ? (
            <li className="list-group-item small text-muted" role="presentation">
              Buscando...
            </li>
          ) : null}
          {!carregando && itens.length === 0 ? (
            <li className="list-group-item small text-muted" role="presentation">
              Nenhum serviço encontrado.
            </li>
          ) : null}
          {!carregando && itens.length > 0
            ? itens.map((s, index) => {
              const ativo = index === indiceAtivo
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={ativo}
                  className={`list-group-item list-group-item-action p-0${ativo ? ' active' : ''}`}
                >
                  <button
                    type="button"
                    className={`btn btn-link text-start text-decoration-none w-100 py-2 px-3 rounded-0${
                      ativo ? ' text-white' : ''
                    }`}
                    onMouseEnter={() => setIndiceAtivo(index)}
                    onClick={() => escolher(s)}
                  >
                    <span className="font-monospace fw-semibold me-2">{s.codigo}</span>
                    <span className="small">{s.descricao}</span>
                  </button>
                </li>
              )
            })
            : null}
        </ul>
      ) : null}
    </div>
  )
}
