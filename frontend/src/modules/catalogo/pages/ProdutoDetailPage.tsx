import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProdutoDetailQuery } from '../hooks/useProdutoDetailQuery'

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

export default function ProdutoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: p, isPending, isError, error } = useProdutoDetailQuery(id)

  const ec = p?.especificacao_contatora
  const ed = p?.especificacao_disjuntor_motor
  const es = p?.especificacao_seccionadora

  return (
    <div className="container-fluid">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Detalhes do produto</h1>
          <p className="text-muted mb-0">Dados cadastrados no catálogo.</p>
        </div>
        {id && (
          <Link to={`/catalogo/${id}/editar`} className="btn btn-primary">
            Editar
          </Link>
        )}
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
                <Row label="L × A × P (mm)" value={`${p.largura_mm ?? '—'} × ${p.altura_mm ?? '—'} × ${p.profundidade_mm ?? '—'}`} />
              </SpecBlock>

              {p.observacoes_tecnicas ? (
                <div className="col-12">
                  <h3 className="h6 text-muted border-bottom pb-2">Observações técnicas</h3>
                  <p className="mb-0 text-break">{p.observacoes_tecnicas}</p>
                </div>
              ) : null}

              {ec && (
                <SpecBlock title="Especificação — contatora">
                  <Row label="Corrente AC-3 (A)" value={String(ec.corrente_ac3_a ?? '—')} />
                  <Row label="Corrente AC-1 (A)" value={String(ec.corrente_ac1_a ?? '—')} />
                  <Row
                    label="Bobina"
                    value={
                      cell(ec.tensao_bobina_display) !== '—'
                        ? cell(ec.tensao_bobina_display)
                        : ec.tensao_bobina_v != null
                          ? `${ec.tensao_bobina_v} V`
                          : '—'
                    }
                  />
                  <Row
                    label="Tipo corrente bobina"
                    value={cell(ec.tipo_corrente_bobina_display ?? ec.tipo_corrente_bobina)}
                  />
                  <Row label="Contatos aux. NA" value={String(ec.contatos_aux_na ?? 0)} />
                  <Row label="Contatos aux. NF" value={String(ec.contatos_aux_nf ?? 0)} />
                  <Row
                    label="Modo montagem"
                    value={cell(ec.modo_montagem_display ?? ec.modo_montagem)}
                  />
                </SpecBlock>
              )}

              {ed && (
                <SpecBlock title="Especificação — disjuntor motor">
                  <Row label="Faixa mín. (A)" value={String(ed.faixa_ajuste_min_a ?? '—')} />
                  <Row label="Faixa máx. (A)" value={String(ed.faixa_ajuste_max_a ?? '—')} />
                  <Row label="Contatos aux. NA" value={String(ed.contatos_aux_na ?? 0)} />
                  <Row label="Contatos aux. NF" value={String(ed.contatos_aux_nf ?? 0)} />
                  <Row
                    label="Modo montagem"
                    value={cell(ed.modo_montagem_display ?? ed.modo_montagem)}
                  />
                </SpecBlock>
              )}

              {es && (
                <SpecBlock title="Especificação — seccionadora">
                  <Row label="Corrente AC-1 (A)" value={String(es.corrente_ac1_a ?? '—')} />
                  <Row label="Corrente AC-3 (A)" value={String(es.corrente_ac3_a ?? '—')} />
                  <Row
                    label="Tipo montagem"
                    value={cell(es.tipo_montagem_display ?? es.tipo_montagem)}
                  />
                  <Row
                    label="Tipo fixação"
                    value={cell(es.tipo_fixacao_display ?? es.tipo_fixacao)}
                  />
                  <Row
                    label="Cor manopla"
                    value={cell(es.cor_manopla_display ?? es.cor_manopla)}
                  />
                </SpecBlock>
              )}

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
