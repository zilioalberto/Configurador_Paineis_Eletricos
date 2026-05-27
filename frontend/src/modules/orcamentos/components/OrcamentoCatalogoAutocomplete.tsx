import { useEffect, useId, useRef, useState } from 'react'

import type { ProdutoListItem } from '@/modules/catalogo/types/produto'

import { useOrcamentoCatalogoBusca } from '../hooks/useOrcamentoCatalogoBusca'

type Props = Readonly<{
  value: string
  onValueChange: (value: string) => void
  onSelectProduto: (produto: ProdutoListItem) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  dropdownZIndex?: number
}>

export default function OrcamentoCatalogoAutocomplete({
  value,
  onValueChange,
  onSelectProduto,
  disabled = false,
  placeholder = 'Buscar no catálogo…',
  className = 'form-control form-control-sm',
  dropdownZIndex = 20,
}: Props) {
  const { itens, carregando, aberto, setAberto, minChars } = useOrcamentoCatalogoBusca(value)
  const [indiceAtivo, setIndiceAtivo] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()

  const listaVisivel = aberto && value.trim().length >= minChars
  const podeSelecionar = !carregando && itens.length > 0

  useEffect(() => {
    if (!listaVisivel || !podeSelecionar) {
      setIndiceAtivo(-1)
      return
    }
    setIndiceAtivo((atual) => (atual >= itens.length ? itens.length - 1 : atual))
  }, [itens, listaVisivel, podeSelecionar, itens.length])

  useEffect(() => {
    if (indiceAtivo < 0 || !listaRef.current) return
    const el = listaRef.current.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [indiceAtivo, itens])

  function escolher(produto: ProdutoListItem) {
    onSelectProduto(produto)
    setAberto(false)
    setIndiceAtivo(-1)
    inputRef.current?.focus()
  }

  function moverIndice(delta: number) {
    if (!podeSelecionar) return
    setIndiceAtivo((atual) => {
      if (atual < 0) {
        return delta > 0 ? 0 : itens.length - 1
      }
      return (atual + delta + itens.length) % itens.length
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listaVisivel) {
      if (event.key === 'ArrowDown' && value.trim().length >= minChars) {
        setAberto(true)
      }
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moverIndice(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        moverIndice(-1)
        break
      case 'Enter':
        if (podeSelecionar && indiceAtivo >= 0 && indiceAtivo < itens.length) {
          event.preventDefault()
          escolher(itens[indiceAtivo])
        }
        break
      case 'Escape':
        event.preventDefault()
        setAberto(false)
        setIndiceAtivo(-1)
        break
      default:
        break
    }
  }

  return (
    <div className="position-relative">
      <input
        ref={inputRef}
        type="search"
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        maxLength={500}
        role="combobox"
        aria-expanded={listaVisivel}
        aria-controls={listaVisivel ? listboxId : undefined}
        aria-activedescendant={
          listaVisivel && indiceAtivo >= 0 ? `${listboxId}-opcao-${indiceAtivo}` : undefined
        }
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
          ref={listaRef}
          id={listboxId}
          role="listbox"
          className="list-group position-absolute w-100 shadow-sm mt-1"
          style={{ zIndex: dropdownZIndex, maxHeight: '14rem', overflowY: 'auto' }}
        >
          {carregando ? (
            <li className="list-group-item small text-muted" role="presentation">
              Buscando…
            </li>
          ) : itens.length === 0 ? (
            <li className="list-group-item small text-muted" role="presentation">
              Nenhum produto encontrado.
            </li>
          ) : (
            itens.map((p, index) => {
              const ativo = index === indiceAtivo
              return (
                <li
                  key={p.id}
                  id={`${listboxId}-opcao-${index}`}
                  role="option"
                  aria-selected={ativo}
                  data-indice={index}
                  className={`list-group-item list-group-item-action p-0${ativo ? ' active' : ''}`}
                >
                  <button
                    type="button"
                    className={`btn btn-link text-start text-decoration-none w-100 py-2 px-3 rounded-0${
                      ativo ? ' text-white' : ''
                    }`}
                    onMouseEnter={() => setIndiceAtivo(index)}
                    onClick={() => escolher(p)}
                  >
                    <span className="font-monospace fw-semibold me-2">{p.codigo}</span>
                    <span className="small">{p.descricao}</span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      ) : null}
    </div>
  )
}
