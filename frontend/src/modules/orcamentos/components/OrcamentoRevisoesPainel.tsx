import { useMemo, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'



import { useToast } from '@/components/feedback'

import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'



import { criarNovaRevisaoOrcamento } from '../services/orcamentosApi'

import type { OrcamentoDto } from '../types/orcamentos'

import { orcamentoDetalhePath, orcamentoOfertaPath } from '../utils/orcamentoUi'

import {

  ehUltimaRevisaoOrcamento,

  montarHistoricoRevisoes,

  podeCriarNovaRevisaoOrcamento,

  rotuloTipoRevisaoOrcamento,

  type LinhaHistoricoRevisao,

} from '../utils/revisaoOrcamentoUi'



type Props = Readonly<{

  orcamento: OrcamentoDto

  podeEditarPerm: boolean

  reabrindoOferta: boolean

  onReabrirOferta: () => void

}>



function classeBadgeStatus(status: string): string {

  const base = 'orcamento-doc__status-badge'

  const map: Record<string, string> = {

    RASCUNHO: `${base} ${base}--rascunho`,

    FINALIZADO: `${base} ${base}--finalizado`,

    ENVIADO: `${base} ${base}--enviado`,

    APROVADO: `${base} ${base}--aprovado`,

    REJEITADO: `${base} ${base}--rejeitado`,

    CANCELADO: `${base} ${base}--cancelado`,

  }

  return map[status] ?? base

}



function rotuloStatus(status: string): string {

  const labels: Record<string, string> = {

    RASCUNHO: 'Rascunho',

    FINALIZADO: 'Finalizado',

    ENVIADO: 'Enviado',

    APROVADO: 'Aprovado',

    REJEITADO: 'Rejeitado',

    CANCELADO: 'Cancelado',

  }

  return labels[status] ?? status

}



function IconeVisualizar() {

  return (

    <svg

      xmlns="http://www.w3.org/2000/svg"

      width="14"

      height="14"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden

    >

      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />

      <circle cx="12" cy="12" r="3" />

    </svg>

  )

}



function LinhaRevisaoCompacta({ linha }: Readonly<{ linha: LinhaHistoricoRevisao }>) {

  const rev = linha.revisao?.trim() ? `Rev. ${linha.revisao}` : '—'

  const verPara = linha.atual ? orcamentoOfertaPath(linha.id) : orcamentoDetalhePath(linha.id)

  const verTitulo = linha.atual

    ? 'Ver proposta ao cliente (atual)'

    : `Abrir revisão ${linha.revisao || linha.codigo}`



  return (

    <li

      className={

        linha.atual

          ? 'orcamento-revisoes-painel__item orcamento-revisoes-painel__item--atual'

          : 'orcamento-revisoes-painel__item'

      }

    >

      <span className="orcamento-revisoes-painel__rev font-monospace">{rev}</span>

      {linha.atual ? <span className="orcamento-revisoes-painel__atual">atual</span> : null}

      <span className="orcamento-revisoes-painel__sep" aria-hidden>

        ·

      </span>

      <span className="orcamento-revisoes-painel__tipo">{rotuloTipoRevisaoOrcamento(linha.tipo_revisao)}</span>

      <span className="orcamento-revisoes-painel__sep" aria-hidden>

        ·

      </span>

      <span className={classeBadgeStatus(linha.status)}>{rotuloStatus(linha.status)}</span>

      <Link

        to={verPara}

        className="orcamento-revisoes-painel__ver"

        title={verTitulo}

        aria-label={linha.atual ? 'Ver proposta ao cliente' : `Ver revisão ${linha.revisao || linha.codigo}`}

      >

        <IconeVisualizar />

      </Link>

    </li>

  )

}



export default function OrcamentoRevisoesPainel({

  orcamento,

  podeEditarPerm,

  reabrindoOferta,

  onReabrirOferta,

}: Props) {

  const { showToast } = useToast()

  const navigate = useNavigate()

  const [processando, setProcessando] = useState(false)

  const [modalRevisao, setModalRevisao] = useState<'COMERCIAL' | 'TECNICA' | null>(null)

  const [paineisReconfig, setPaineisReconfig] = useState<Set<string>>(new Set())



  const linhas = useMemo(() => montarHistoricoRevisoes(orcamento), [orcamento])

  const ultimaRevisao = ehUltimaRevisaoOrcamento(orcamento)

  const podeNovaRevisao = podeCriarNovaRevisaoOrcamento(orcamento)

  const ultimaDaLinha = linhas[linhas.length - 1]

  const podeReabrir =

    ultimaRevisao && podeEditarPerm && orcamento.status === 'FINALIZADO'

  const paineis = orcamento.configuradores_painel ?? []



  async function confirmarNovaRevisao() {

    if (!modalRevisao) return

    if (modalRevisao === 'TECNICA' && paineisReconfig.size === 0) {

      showToast({

        variant: 'warning',

        message: 'Selecione ao menos um painel para reconfigurar na revisão técnica.',

      })

      return

    }

    setProcessando(true)

    try {

      const payload =

        modalRevisao === 'TECNICA'

          ? {

              tipo_revisao: modalRevisao,

              paineis_reconfigurar: [...paineisReconfig],

            }

          : { tipo_revisao: modalRevisao }

      const novo = await criarNovaRevisaoOrcamento(orcamento.id, payload)

      showToast({ variant: 'success', message: `Revisão ${novo.codigo} criada.` })

      setModalRevisao(null)

      navigate(orcamentoDetalhePath(novo.id))

    } catch (err) {

      showToast({

        variant: 'danger',

        message: extrairMensagemErroApi(err) || 'Não foi possível criar a revisão.',

      })

    } finally {

      setProcessando(false)

    }

  }



  function toggleReconfig(painelId: string) {

    setPaineisReconfig((prev) => {

      const next = new Set(prev)

      if (next.has(painelId)) next.delete(painelId)

      else next.add(painelId)

      return next

    })

  }



  const hintNovaRevisao =

    ultimaRevisao &&

    !podeNovaRevisao &&

    (orcamento.status === 'RASCUNHO' || orcamento.status === 'CANCELADO')



  return (

    <div className="orcamento-revisoes-painel">

      <div className="orcamento-revisoes-painel__bar">

        <span className="orcamento-revisoes-painel__label">Revisões da oferta</span>

        {orcamento.orcamento_origem ? (

          <span className="orcamento-revisoes-painel__origem small text-muted">

            Derivada de{' '}

            <Link to={orcamentoDetalhePath(orcamento.orcamento_origem)}>revisão anterior</Link>

          </span>

        ) : null}

        <ul className="orcamento-revisoes-painel__lista mb-0">

          {linhas.map((linha) => (

            <LinhaRevisaoCompacta key={linha.id} linha={linha} />

          ))}

        </ul>

        <div className="orcamento-revisoes-painel__acoes">

          {podeNovaRevisao ? (

            <>

              <button

                type="button"

                className="btn btn-sm btn-primary"

                disabled={processando}

                onClick={() => setModalRevisao('COMERCIAL')}

                title="Copia itens para ajuste de preços (oferta finalizada ou enviada)"

              >

                Nova revisão

              </button>

              <button

                type="button"

                className="btn btn-sm btn-outline-secondary"

                disabled={processando || paineis.length === 0}

                onClick={() => {

                  setPaineisReconfig(new Set())

                  setModalRevisao('TECNICA')

                }}

                title="Reconfigurar painéis selecionados"

              >

                Técnica

              </button>

            </>

          ) : null}

          {podeReabrir ? (

            <button

              type="button"

              className="btn btn-sm btn-outline-secondary"

              onClick={onReabrirOferta}

              disabled={reabrindoOferta}

              title="Somente a última revisão da linha pode ser reaberta"

            >

              {reabrindoOferta ? 'Reabrindo...' : 'Reabrir'}

            </button>

          ) : null}

        </div>

      </div>



      {hintNovaRevisao ? (

        <p className="orcamento-revisoes-painel__hint small text-muted mb-0">

          Para gerar outra revisão, finalize e marque como{' '}

          <strong>Finalizado</strong> ou <strong>Enviado</strong> esta versão — ou abra a revisão

          anterior já enviada.

        </p>

      ) : null}



      {!ultimaRevisao && ultimaDaLinha ? (

        <p className="orcamento-revisoes-painel__hint small text-muted mb-0">

          Nova revisão e reabertura em{' '}

          <Link to={orcamentoDetalhePath(ultimaDaLinha.id)}>

            Rev. {ultimaDaLinha.revisao || '—'}

          </Link>

          .

        </p>

      ) : null}



      {modalRevisao ? (

        <div

          className="modal show d-block"

          tabIndex={-1}

          role="dialog"

          style={{ background: 'rgba(0,0,0,.4)' }}

        >

          <div className="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down">

            <div className="modal-content">

              <div className="modal-header">

                <h4 className="modal-title h5">

                  {modalRevisao === 'COMERCIAL' ? 'Revisão comercial' : 'Revisão técnica'}

                </h4>

                <button

                  type="button"

                  className="btn-close"

                  aria-label="Fechar"

                  disabled={processando}

                  onClick={() => setModalRevisao(null)}

                />

              </div>

              <div className="modal-body">

                {modalRevisao === 'COMERCIAL' ? (

                  <p className="small mb-0">

                    Será criada a próxima revisão de{' '}

                    <strong>{orcamento.codigo_base || orcamento.codigo}</strong> com cópia dos itens

                    para ajuste de margens e preços.

                  </p>

                ) : (

                  <>

                    <p className="small text-muted">Marque os painéis que serão reconfigurados:</p>

                    <ul className="list-unstyled mb-0">

                      {paineis.map((p) => (

                        <li key={p.id} className="mb-1">

                          <label className="form-check-label">

                            <input

                              type="checkbox"

                              className="form-check-input me-2"

                              checked={paineisReconfig.has(p.id)}

                              onChange={() => toggleReconfig(p.id)}

                              disabled={processando}

                            />

                            {p.descricao_painel}

                          </label>

                        </li>

                      ))}

                    </ul>

                  </>

                )}

              </div>

              <div className="modal-footer">

                <button

                  type="button"

                  className="btn btn-secondary btn-sm"

                  disabled={processando}

                  onClick={() => setModalRevisao(null)}

                >

                  Cancelar

                </button>

                <button

                  type="button"

                  className="btn btn-primary btn-sm"

                  disabled={processando}

                  onClick={() => void confirmarNovaRevisao()}

                >

                  Criar revisão

                </button>

              </div>

            </div>

          </div>

        </div>

      ) : null}

    </div>

  )

}


