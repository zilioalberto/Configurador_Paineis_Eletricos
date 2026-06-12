import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { labelObjetivoEntrada } from '@/modules/fiscal/constants/objetivoEntradaOptions'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { CATEGORIA_PARA_ESPEC_KEY } from '../constants/categoriaEspecKey'
import { useProdutoDetailQuery } from '../hooks/useProdutoDetailQuery'
import type { CategoriaProdutoNome } from '../types/categoria'
import type { ItemFiscalProduto } from '../types/produto'
import { labelCampoEspec, SPEC_FIELDS_BY_CATEGORIA } from '../utils/specFormHelpers'
import { catalogoPaths } from '../catalogoPaths'

function SpecBlock({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
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

function ItemFiscalTable({ itens }: Readonly<{ itens: ItemFiscalProduto[] }>) {
  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered mb-0 align-middle">
        <thead className="table-light">
          <tr>
            <th>Rótulo</th>
            <th>CFOP</th>
            <th>Objetivo</th>
            <th>Orig.</th>
            <th>CST ICMS</th>
            <th>CSOSN</th>
            <th>Grupo XML</th>
            <th className="text-end">% ICMS</th>
            <th className="text-end">R$ ICMS</th>
            <th className="text-end">% IPI</th>
            <th>Item NF-e</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => (
            <tr key={it.id}>
              <td>{cell(it.rotulo)}</td>
              <td>
                <code>{cell(it.cfop)}</code>
              </td>
              <td className="small">{labelObjetivoEntrada(it.objetivo_entrada)}</td>
              <td>{cell(it.origem_mercadoria)}</td>
              <td>
                <code>{cell(it.cst_icms)}</code>
              </td>
              <td>
                <code>{cell(it.csosn)}</code>
              </td>
              <td className="small">{cell(it.icms_grupo_xml)}</td>
              <td className="text-end">{cell(it.p_icms)}</td>
              <td className="text-end">{cell(it.v_icms)}</td>
              <td className="text-end">{cell(it.p_ipi)}</td>
              <td>{it.n_item_nfe ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Row({ label, value }: Readonly<{ label: string; value: ReactNode }>) {
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

/** Visualização read-only do produto e especificação técnica. */
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
            <Link to={catalogoPaths.produtoNovo} className="btn btn-outline-primary">
              Novo produto
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate(catalogoPaths.produtos)}
          >
            Fechar
          </button>
          {id && canEditProduto ? (
            <Link to={catalogoPaths.produtoEditar(id)} className="btn btn-primary">
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
                <Row label="Preço base" value={p.preco_base} />
                <Row label="Ativo" value={p.ativo ? 'Sim' : 'Não'} />
              </SpecBlock>

              {p.informacao_comercial ? (
                <SpecBlock title="Fiscal e logística (referência NF-e)">
                  <Row label="GTIN / EAN" value={cell(p.informacao_comercial.gtin)} />
                  <Row label="NCM" value={cell(p.informacao_comercial.ncm)} />
                  <Row label="CEST" value={cell(p.informacao_comercial.cest)} />
                  <Row label="Origem (ICMS)" value={cell(p.informacao_comercial.origem_mercadoria)} />
                  <Row
                    label="Unidade tributável"
                    value={cell(p.informacao_comercial.unidade_tributavel)}
                  />
                  <Row
                    label="Perfil fiscal"
                    value={cell(p.informacao_comercial.codigo_perfil_fiscal)}
                  />
                  <Row
                    label="Peso líq. / bruto (kg)"
                    value={`${cell(p.informacao_comercial.peso_liquido_kg)} / ${cell(p.informacao_comercial.peso_bruto_kg)}`}
                  />
                </SpecBlock>
              ) : null}

              {p.itens_fiscais && p.itens_fiscais.length > 0 ? (
                <SpecBlock title="Itens fiscais (referência)">
                  <div className="col-12">
                    <ItemFiscalTable itens={p.itens_fiscais} />
                  </div>
                </SpecBlock>
              ) : null}

              <SpecBlock title="Fabricante e dimensões">
                <Row label="Fabricante" value={p.fabricante_parceiro_nome} />
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
                <Link to={catalogoPaths.produtos} className="btn btn-outline-secondary btn-sm">
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
