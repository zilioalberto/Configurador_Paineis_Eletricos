import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useToast } from '@/components/feedback'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'

import {
  adicionarPainelConfigurador,
  criarNovaRevisaoOrcamento,
  iniciarConfiguradorPainel,
  obterOrcamento,
  sincronizarComposicaoPainel,
} from '../services/erpApi'
import type { OrcamentoConfiguradorPainelDto, OrcamentoDto } from '../types/erp'
import {
  configuradorFluxoOrcamentoPath,
  configuradorNovoPath,
  orcamentoDetalhePath,
  proximaDescricaoPainel,
} from '../utils/orcamentoUi'

type Props = {
  orcamento: OrcamentoDto
  podeEditar: boolean
  onAtualizado: (orcamento: OrcamentoDto) => void
}

const STATUS_REVISAO = new Set(['ENVIADO', 'APROVADO', 'REJEITADO'])

export default function OrcamentoPainelsCard({ orcamento, podeEditar, onAtualizado }: Props) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [descricaoPainel, setDescricaoPainel] = useState(() => proximaDescricaoPainel(orcamento))
  const [processando, setProcessando] = useState(false)
  const [paineisReconfig, setPaineisReconfig] = useState<Set<string>>(new Set())
  const [modalRevisao, setModalRevisao] = useState<'COMERCIAL' | 'TECNICA' | null>(null)

  const paineis = orcamento.configuradores_painel ?? []
  const editavel = podeEditar && orcamento.editavel !== false
  const podeNovaRevisao = STATUS_REVISAO.has(orcamento.status)

  useEffect(() => {
    setDescricaoPainel(proximaDescricaoPainel(orcamento))
  }, [orcamento.id, orcamento.configuradores_painel?.length, orcamento.titulo, orcamento.codigo_base])

  async function recarregar() {
    onAtualizado(await obterOrcamento(orcamento.id))
  }

  async function handleAdicionarPainel() {
    const desc = descricaoPainel.trim()
    if (!desc) {
      showToast({ variant: 'warning', message: 'Informe o título do painel.' })
      return
    }
    setProcessando(true)
    try {
      await adicionarPainelConfigurador(orcamento.id, desc)
      await recarregar()
      showToast({ variant: 'success', message: 'Painel adicionado à proposta.' })
    } catch {
      showToast({ variant: 'danger', message: 'Não foi possível adicionar o painel.' })
    } finally {
      setProcessando(false)
    }
  }

  async function abrirConfigurador(vinculo: OrcamentoConfiguradorPainelDto) {
    setProcessando(true)
    try {
      const atualizado = await iniciarConfiguradorPainel(orcamento.id, vinculo.id)
      if (atualizado.projeto_configurador_id) {
        navigate(
          configuradorFluxoOrcamentoPath(
            configuradorPaths.cargas(atualizado.projeto_configurador_id),
            { orcamentoId: orcamento.id, vinculoId: vinculo.id }
          )
        )
        return
      }
      navigate(
        configuradorNovoPath({
          orcamentoId: orcamento.id,
          vinculoId: vinculo.id,
          nome: vinculo.descricao_painel,
          ordemPainel: vinculo.ordem,
          cliente: orcamento.cliente_nome,
        })
      )
    } catch (err) {
      showToast({
        variant: 'danger',
        message: extrairMensagemErroApi(err, 'Não foi possível iniciar o configurador.'),
      })
    } finally {
      setProcessando(false)
    }
  }

  async function handleSincronizar(vinculo: OrcamentoConfiguradorPainelDto) {
    setProcessando(true)
    try {
      const resp = await sincronizarComposicaoPainel(orcamento.id, vinculo.id)
      onAtualizado(resp.orcamento)
      showToast({
        variant: 'success',
        message: `${resp.itens_sincronizados} item(ns) importados da composição.`,
      })
    } catch {
      showToast({ variant: 'danger', message: 'Não foi possível sincronizar a composição.' })
    } finally {
      setProcessando(false)
    }
  }

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
    } catch {
      showToast({ variant: 'danger', message: 'Não foi possível criar a revisão.' })
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

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h2 className="h5 mb-1">Configurador de painéis</h2>
            <p className="text-muted small mb-0">
              Cada painel da proposta abre uma configuração técnica no CPQ. Sincronize a composição
              aprovada quando estiver pronta.
            </p>
          </div>
        </div>

        {orcamento.orcamento_origem ? (
          <p className="small mb-3">
            Derivada de{' '}
            <Link to={orcamentoDetalhePath(orcamento.orcamento_origem)}>revisão anterior</Link>
            {' · '}
            tipo: <span className="text-uppercase">{orcamento.tipo_revisao}</span>
          </p>
        ) : null}

        {paineis.length === 0 ? (
          <div className="alert alert-light border mb-3 mb-0">
            Nenhum painel vinculado. Adicione o primeiro painel abaixo para abrir o configurador.
          </div>
        ) : (
          <div className="vstack gap-2 mb-3">
            {paineis.map((painel) => {
              const pendenciasAbertas = painel.pendencias_abertas ?? 0
              const bloqueadoPorPendencia =
                Boolean(painel.projeto_configurador_id) && pendenciasAbertas > 0
              return (
              <div
                key={painel.id}
                className="border rounded-3 p-3 bg-light-subtle"
              >
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <div className="fw-semibold">{painel.descricao_painel}</div>
                  <div className="small text-muted">
                    {painel.modo === 'HERANCA_HISTORICA'
                      ? 'Histórico (revisão anterior)'
                      : 'Ativo na proposta'}
                    {painel.projeto_configurador_codigo
                      ? ` · CPQ ${painel.projeto_configurador_codigo}`
                      : ' · sem configuração CPQ'}
                    {painel.sincronizado_em ? ' · composição sincronizada' : ''}
                    {bloqueadoPorPendencia
                      ? ` · ${pendenciasAbertas} pendência(s) aberta(s)`
                      : ''}
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {editavel && painel.modo === 'ATIVO' && !painel.projeto_configurador_id ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={processando}
                      onClick={() => void abrirConfigurador(painel)}
                    >
                      Configurar painel
                    </button>
                  ) : null}
                  {painel.projeto_configurador_id ? (
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      to={configuradorFluxoOrcamentoPath(
                        configuradorPaths.composicao(painel.projeto_configurador_id),
                        { orcamentoId: orcamento.id, vinculoId: painel.id }
                      )}
                    >
                      Continuar configurador
                    </Link>
                  ) : null}
                  {editavel && painel.modo === 'ATIVO' && painel.projeto_configurador_id ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={processando || bloqueadoPorPendencia}
                      title={
                        bloqueadoPorPendencia
                          ? 'Resolva todas as pendências abertas na composição antes de importar.'
                          : undefined
                      }
                      onClick={() => void handleSincronizar(painel)}
                    >
                      Sincronizar composição
                    </button>
                  ) : null}
                </div>
                </div>
                {bloqueadoPorPendencia ? (
                  <p className="small text-warning mb-0 mt-2">
                    Importação bloqueada: resolva ou ignore as {pendenciasAbertas} pendência(s) na
                    composição do painel antes de sincronizar com a proposta.
                  </p>
                ) : null}
              </div>
            )})}
          </div>
        )}

        {editavel ? (
          <div className="border rounded-3 p-3 bg-white">
            <label className="form-label fw-semibold mb-1" htmlFor="orc-novo-painel">
              Novo painel na proposta
            </label>
            <p className="text-muted small mb-2">
              Sugestão automática com código da proposta, título e sequência do painel.
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-stretch">
              <input
                id="orc-novo-painel"
                className="form-control flex-grow-1"
                style={{ minWidth: '16rem' }}
                value={descricaoPainel}
                onChange={(e) => setDescricaoPainel(e.target.value)}
                disabled={processando}
              />
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={processando}
                onClick={() => void handleAdicionarPainel()}
              >
                Adicionar painel
              </button>
            </div>
          </div>
        ) : null}

        {podeNovaRevisao ? (
          <div className="border-top pt-3 mt-3">
            <h3 className="h6">Nova revisão da oferta</h3>
            <p className="text-muted small mb-2">
              Comercial: copia itens para ajuste de preços. Técnica: escolha painéis a reconfigurar;
              os demais ficam como histórico.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                disabled={processando}
                onClick={() => setModalRevisao('COMERCIAL')}
              >
                Revisão comercial
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-warning"
                disabled={processando || paineis.length === 0}
                onClick={() => {
                  setPaineisReconfig(new Set())
                  setModalRevisao('TECNICA')
                }}
              >
                Revisão técnica
              </button>
            </div>
          </div>
        ) : null}

        {modalRevisao ? (
          <div
            className="modal show d-block"
            tabIndex={-1}
            role="dialog"
            style={{ background: 'rgba(0,0,0,.4)' }}
          >
            <div className="modal-dialog">
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
                      Será criada a próxima revisão ({orcamento.codigo_base}) com cópia dos itens
                      para ajuste de margens e preços, sem reabrir o configurador.
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
    </div>
  )
}
