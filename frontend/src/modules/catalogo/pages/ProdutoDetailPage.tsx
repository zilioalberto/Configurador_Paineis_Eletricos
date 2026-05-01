import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { CATEGORIA_PARA_ESPEC_KEY } from '../constants/categoriaEspecKey'
import { useProdutoDetailQuery } from '../hooks/useProdutoDetailQuery'
import type { CategoriaProdutoNome } from '../types/categoria'
import { labelCampoEspec, SPEC_FIELDS_BY_CATEGORIA } from '../utils/specFormHelpers'

function SpecBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="col-12">
      <h3 className="h6 text-muted border-bottom pb-2">{title}</h3>
      <div className="row g-2 small">{children}</div>
    </div>
  )
}

function cell(v: unknown): string {
  if (v == null || v === '') return '—'
  return String(v)
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="col-md-4">
      <strong className="d-block text-muted">{label}</strong>
      <div>{value ?? '—'}</div>
    </div>
  )
}

function tituloBlocoEspecificacao(apiKey: string): string {
  const slug = apiKey.replace(/^especificacao_/, '').replace(/_/g, ' ')
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

export default function ProdutoDetailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const canEditProduto = hasPermission(user, PERMISSION_KEYS.MATERIAL_EDITAR_LISTA)
  const { data: p, isPending, isError, error } = useProdutoDetailQuery(id)

  const bag = p as Record<string, unknown> | undefined
  const nomeCat = (p?.categoria_nome ?? p?.categoria) as CategoriaProdutoNome | undefined

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Detalhes do produto</h1>
          <p className="text-muted mb-0">Dados cadastrados no catálogo.</p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {canEditProduto ? (
            <Link to="/catalogo/novo" className="btn btn-outline-primary">
              Novo produto
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/catalogo')}
          >
            Fechar
          </button>
          {id && canEditProduto ? (
            <Link to={`/catalogo/${id}/editar`} className="btn btn-primary">
              Editar
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Produto não informado.
            </div>
          )}

          {id && isPending && <p className="mb-0 text-muted">Carregando…</p>}

          {id && isError && (
            <div className="alert alert-danger mb-0" role="alert">
              {error instanceof Error ? error.message : 'Não foi possível carregar.'}
            </div>
          )}

          {id && !isPending && !isError && p && (
            <div className="row g-4">
              <div className="col-12">
                <h2 className="h5">{p.codigo}</h2>
                <p className="mb-0">{p.descricao}</p>
              </div>

              <SpecBlock title="Classificação e comercial">
                <Row
                  label="Categoria"
                  value={p.categoria_display ?? p.categoria_nome}
                />
                <Row label="Unidade" value={p.unidade_medida_display ?? p.unidade_medida} />
                <Row label="Valor unitário" value={p.valor_unitario} />
                <Row label="Ativo" value={p.ativo ? 'Sim' : 'Não'} />
              </SpecBlock>

              <SpecBlock title="Fabricante e dimensões">
                <Row label="Fabricante" value={p.fabricante} />
                <Row label="Ref. fabricante" value={p.referencia_fabricante} />
                <Row
                  label="L × A × P (mm)"
                  value={`${p.largura_mm ?? '—'} × ${p.altura_mm ?? '—'} × ${p.profundidade_mm ?? '—'}`}
                />
              </SpecBlock>

              {p.observacoes_tecnicas ? (
                <div className="col-12">
                  <h3 className="h6 text-muted border-bottom pb-2">Observações técnicas</h3>
                  <p className="mb-0 text-break">{p.observacoes_tecnicas}</p>
                </div>
              ) : null}

              {nomeCat &&
                (() => {
                  const specKey = CATEGORIA_PARA_ESPEC_KEY[nomeCat]
                  const row = specKey ? bag?.[specKey] : undefined
                  if (!specKey || !row || typeof row !== 'object') return null
                  const meta = SPEC_FIELDS_BY_CATEGORIA[nomeCat]
                  const data = row as Record<string, unknown>
                  return (
                    <SpecBlock
                      key={specKey}
                      title={`Especificação — ${tituloBlocoEspecificacao(specKey)}`}
                    >
                      {meta?.map(({ name }) => {
                        const dispKey = `${name}_display`
                        const displayVal = data[dispKey]
                        const rawVal = data[name]
                        const show =
                          displayVal !== undefined && displayVal !== null && displayVal !== ''
                            ? cell(displayVal)
                            : cell(rawVal)
                        return (
                          <Row key={name} label={labelCampoEspec(name)} value={show} />
                        )
                      }) ?? (
                        <p className="small text-muted mb-0">
                          Campos desta categoria não estão listados no registo do frontend.
                        </p>
                      )}
                    </SpecBlock>
                  )
                })()}

              <div className="col-12">
                <Link to="/catalogo" className="btn btn-outline-secondary btn-sm">
                  Lista de produtos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
