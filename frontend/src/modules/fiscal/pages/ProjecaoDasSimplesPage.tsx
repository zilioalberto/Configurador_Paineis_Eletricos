import { type SyntheticEvent, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'

import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import { useProjecaoDasSimplesQuery } from '../hooks/useProjecaoDasSimplesQuery'
import {
  atualizarPerfilTributarioSimples,
  salvarAjusteFaturamentoMensal,
} from '../services/fiscalSimplesService'
import type { ProjecaoDasSimplesResponse } from '../types/simplesNacional'
import {
  formatCompetencia,
  formatMoedaBrl,
  labelAnexoSimples,
} from '../utils/fiscalDisplay'

function competenciaAtual(): string {
  const hoje = new Date()
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
}

type ProjecaoDasResumoPainelProps = {
  readonly data: ProjecaoDasSimplesResponse
}

function ProjecaoDasResumoPainel({ data }: ProjecaoDasResumoPainelProps) {
  return (
    <>
      <div className="card border-primary mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="text-muted small">RBT12 total</div>
              <div className="fs-5 fw-semibold">{formatMoedaBrl(data.rbt12_total)}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">Receita da competência</div>
              <div className="fs-5 fw-semibold">{formatMoedaBrl(data.receita_competencia)}</div>
            </div>
            <div className="col-md-4">
              <div className="text-muted small">DAS estimado</div>
              <div className="fs-4 fw-bold text-primary">
                {formatMoedaBrl(data.das_estimado_total)}
              </div>
            </div>
          </div>
          {data.fator_r ? (
            <p className="small text-muted mb-0 mt-2">
              Fator R: {data.fator_r} — serviços no Anexo {data.anexo_servicos}
            </p>
          ) : null}
        </div>
      </div>

      {data.avisos.length > 0 ? (
        <div className="alert alert-warning">
          <ul className="mb-0 ps-3">
            {data.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.parcelas.length > 0 ? (
        <div className="card mb-3">
          <div className="card-header">Parcelas por anexo</div>
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Anexo</th>
                  <th>Receita mês</th>
                  <th>RBT12 anexo</th>
                  <th>Alíq. efetiva</th>
                  <th className="text-end">DAS</th>
                </tr>
              </thead>
              <tbody>
                {data.parcelas.map((p) => (
                  <tr key={p.anexo}>
                    <td>{labelAnexoSimples(p.anexo as '' | 'I')}</td>
                    <td>{formatMoedaBrl(p.receita_mes)}</td>
                    <td>{formatMoedaBrl(p.rbt12_anexo)}</td>
                    <td>{(Number(p.aliquota_efetiva) * 100).toFixed(2)}%</td>
                    <td className="text-end">{formatMoedaBrl(p.das_estimado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  )
}

/** Projeção de DAS do Simples Nacional a partir das NF-es emitidas importadas. */
export default function ProjecaoDasSimplesPage() {
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [competencia, setCompetencia] = useState(competenciaAtual)
  const [folha, setFolha] = useState('')
  const [encargos, setEncargos] = useState('')

  const { data, isPending, isError, error, refetch } = useProjecaoDasSimplesQuery(competencia)

  const perfilSalvar = useMutation({
    mutationFn: () =>
      atualizarPerfilTributarioSimples({
        folha_salarios_12m: folha || '0',
        encargos_folha_12m: encargos || '0',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: fiscalQueryKeys.simplesProjecao(competencia) })
      showToast({
        variant: 'success',
        title: 'Perfil atualizado',
        message: 'Os dados tributários foram salvos para a projeção.',
      })
      refetch().catch(() => undefined)
    },
    onError: (err) => {
      showToast({
        variant: 'danger',
        title: 'Perfil tributário',
        message: extrairMensagemErroApi(err),
      })
    },
  })

  const perfil = data?.perfil
  const valoresPerfil = useMemo(() => {
    if (!perfil) return null
    return {
      folha: perfil.folha_salarios_12m,
      encargos: perfil.encargos_folha_12m,
    }
  }, [perfil])

  const onSalvarPerfil = (e: SyntheticEvent) => {
    e.preventDefault()
    perfilSalvar.mutate()
  }

  const onSalvarAjuste = async (comp: string, valor: string) => {
    try {
      await salvarAjusteFaturamentoMensal({ competencia: comp, valor_ajuste: valor || '0' })
      await qc.invalidateQueries({ queryKey: fiscalQueryKeys.simplesProjecao(competencia) })
      showToast({ variant: 'success', title: 'Ajuste salvo', message: comp })
      refetch().catch(() => undefined)
    } catch (err) {
      showToast({
        variant: 'danger',
        title: 'Ajuste mensal',
        message: extrairMensagemErroApi(err),
      })
    }
  }

  return (
    <div className="container-fluid">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Projeção DAS — Simples Nacional
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h3 mb-2">Projeção DAS — Simples Nacional</h1>
          <p className="text-muted mb-0">
            Estimativa com base nas NF-es emitidas importadas e RBT12 dos últimos 12 meses. Conferir
            sempre com PGDAS-D e contador.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to={fiscalPaths.nfesEmitidas} className="btn btn-outline-primary">
            NF-es emitidas
          </Link>
          <Link to={fiscalPaths.nfeEmitidaImportar} className="btn btn-primary">
            Importar XMLs
          </Link>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <div className="card h-100">
            <div className="card-body">
              <h2 className="h6">Competência</h2>
              <input
                type="month"
                className="form-control mb-3"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
              />
              <form onSubmit={onSalvarPerfil}>
                <h3 className="h6 mt-2">Fator R (últimos 12 meses)</h3>
                <div className="mb-2">
                  <label className="form-label" htmlFor="folha-12m">
                    Folha de salários
                  </label>
                  <input
                    id="folha-12m"
                    className="form-control"
                    inputMode="decimal"
                    placeholder={valoresPerfil?.folha ?? '0,00'}
                    value={folha}
                    onChange={(e) => setFolha(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="encargos-12m">
                    Encargos (INSS, FGTS…)
                  </label>
                  <input
                    id="encargos-12m"
                    className="form-control"
                    inputMode="decimal"
                    placeholder={valoresPerfil?.encargos ?? '0,00'}
                    value={encargos}
                    onChange={(e) => setEncargos(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-outline-primary btn-sm" disabled={perfilSalvar.isPending}>
                  Salvar perfil
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {isError ? (
            <div className="alert alert-danger" role="alert">
              {error instanceof Error ? error.message : 'Erro ao calcular projeção.'}
            </div>
          ) : null}
          {isPending ? <p className="text-muted">Calculando…</p> : null}
          {data ? <ProjecaoDasResumoPainel data={data} /> : null}
        </div>
      </div>

      {data?.faturamento_mensal ? (
        <div className="card">
          <div className="card-header">Faturamento — últimos 12 meses</div>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Competência</th>
                  <th className="text-end">NF-es</th>
                  <th className="text-end">Qtd.</th>
                  <th className="text-end">Ajuste manual</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.faturamento_mensal.map((row) => (
                  <tr key={row.competencia}>
                    <td>{formatCompetencia(row.competencia)}</td>
                    <td className="text-end">{formatMoedaBrl(row.valor_nfes)}</td>
                    <td className="text-end">{row.quantidade_nfes}</td>
                    <td className="text-end">
                      <input
                        type="text"
                        className="form-control form-control-sm text-end d-inline-block"
                        style={{ maxWidth: '8rem' }}
                        defaultValue={row.valor_ajuste}
                        onBlur={(e) => {
                          if (e.target.value !== row.valor_ajuste) {
                            void onSalvarAjuste(row.competencia, e.target.value)
                          }
                        }}
                        aria-label={`Ajuste ${row.competencia}`}
                      />
                    </td>
                    <td className="text-end fw-semibold">{formatMoedaBrl(row.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
