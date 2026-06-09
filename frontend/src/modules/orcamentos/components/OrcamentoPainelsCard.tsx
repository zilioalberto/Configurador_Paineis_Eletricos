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
} from '../services/orcamentosApi'
import type { OrcamentoConfiguradorPainelDto, OrcamentoDto } from '../types/orcamentos'
import {
  configuradorFluxoOrcamentoPath,
  configuradorNovoPath,
  orcamentoDetalhePath,
  proximaDescricaoPainel,
} from '../utils/orcamentoUi'
import { podeCriarNovaRevisaoOrcamento } from '../utils/revisaoOrcamentoUi'

type Props = Readonly<{
  orcamento: OrcamentoDto
  podeEditar: boolean
  onAtualizado: (orcamento: OrcamentoDto) => void
  embedded?: boolean
}>

export default function OrcamentoPainelsCard({
  orcamento,
  podeEditar,
  onAtualizado,
  embedded = false,
}: Props) {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [descricaoPainel, setDescricaoPainel] = useState(() => proximaDescricaoPainel(orcamento))
  const [processando, setProcessando] = useState(false)
  const [paineisReconfig, setPaineisReconfig] = useState<Set<string>>(new Set())
  const [modalRevisao, setModalRevisao] = useState<'COMERCIAL' | 'TECNICA' | null>(null)

  const paineis = orcamento.configuradores_painel ?? []
  const editavel = podeEditar && orcamento.editavel !== false
  const podeNovaRevisao = podeCriarNovaRevisaoOrcamento(orcamento)

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
        message: extrairMensagemErroApi(err) || 'Não foi possível iniciar o configurador.',
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

  const conteudo = (
    <>
      {!embedded && orcamento.orcamento_origem ? (
        <span className="small text-muted d-block mb-2">
          Derivada de{' '}
          <Link to={orcamentoDetalhePath(orcamento.orcamento_origem)}>revisão anterior</Link>
          {' · '}
          {orcamento.tipo_revisao}
        </span>
      ) : null}

      {paineis.length === 0 ? (
        <p className="small text-muted mb-2">
          Nenhum painel vinculado.
          {editavel ? ' Adicione abaixo para abrir o CPQ.' : null}
        </p>
      ) : (
        <div className="table-responsive mb-2">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Painel</th>
                <th className="d-none d-md-table-cell">Situação</th>
                <th className="text-end">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paineis.map((painel) => (
                <OrcamentoPainelRow
                  key={painel.id}
                  editavel={editavel}
                  orcamentoId={orcamento.id}
                  painel={painel}
                  processando={processando}
                  onAbrirConfigurador={() => {
                    abrirConfigurador(painel).catch(() => undefined)
                  }}
                  onSincronizar={() => {
                    handleSincronizar(painel).catch(() => undefined)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editavel ? (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <label className="visually-hidden" htmlFor="orc-novo-painel">
            Novo painel na proposta
          </label>
          <input
            id="orc-novo-painel"
            className="form-control form-control-sm flex-grow-1"
            style={{ minWidth: '12rem', maxWidth: '28rem' }}
            value={descricaoPainel}
            onChange={(e) => setDescricaoPainel(e.target.value)}
            disabled={processando}
            placeholder="Título do novo painel"
            title="Sugestão automática com código da proposta e sequência"
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            disabled={processando}
            onClick={() => {
              handleAdicionarPainel().catch(() => undefined)
            }}
          >
            Adicionar painel
          </button>
        </div>
      ) : null}

      {!embedded && podeNovaRevisao ? (
        <div className="d-flex flex-wrap align-items-center gap-2 mt-2 pt-2 border-top">
          <span className="small text-muted me-1">Nova revisão:</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={processando}
            onClick={() => setModalRevisao('COMERCIAL')}
            title="Copia itens para ajuste de preços, sem reabrir o configurador"
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
            title="Escolha painéis a reconfigurar; os demais ficam como histórico"
          >
            Revisão técnica
          </button>
        </div>
      ) : null}

      {!embedded && modalRevisao ? (
        <OrcamentoRevisaoModal
          modalRevisao={modalRevisao}
          codigoBase={orcamento.codigo_base}
          paineis={paineis}
          paineisReconfig={paineisReconfig}
          processando={processando}
          onClose={() => setModalRevisao(null)}
          onConfirm={() => {
            confirmarNovaRevisao().catch(() => undefined)
          }}
          onToggleReconfig={toggleReconfig}
        />
      ) : null}
    </>
  )

  if (embedded) return conteudo

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body py-2 px-3">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
          <h2 className="h6 mb-0">Configurador de painéis</h2>
        </div>
        {conteudo}
      </div>
    </div>
  )
}

function OrcamentoRevisaoModal({
  modalRevisao,
  codigoBase,
  paineis,
  paineisReconfig,
  processando,
  onClose,
  onConfirm,
  onToggleReconfig,
}: Readonly<{
  modalRevisao: 'COMERCIAL' | 'TECNICA'
  codigoBase: string
  paineis: OrcamentoConfiguradorPainelDto[]
  paineisReconfig: Set<string>
  processando: boolean
  onClose: () => void
  onConfirm: () => void
  onToggleReconfig: (painelId: string) => void
}>) {
  return (
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
              onClick={onClose}
            />
          </div>
          <div className="modal-body">
            {modalRevisao === 'COMERCIAL' ? (
              <p className="small mb-0">
                Será criada a próxima revisão ({codigoBase}) com cópia dos itens para ajuste de
                margens e preços, sem reabrir o configurador.
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
                          onChange={() => onToggleReconfig(p.id)}
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
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={processando}
              onClick={onConfirm}
            >
              Criar revisão
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function rotuloSituacaoPainel(painel: OrcamentoConfiguradorPainelDto): string {
  const partes: string[] = []
  if (painel.modo === 'HERANCA_HISTORICA') {
    partes.push('Histórico')
  } else {
    partes.push('Ativo')
  }
  if (painel.projeto_configurador_codigo) {
    partes.push(`CPQ ${painel.projeto_configurador_codigo}`)
  } else {
    partes.push('Sem CPQ')
  }
  if (painel.sincronizado_em) partes.push('Sincronizado')
  const pendencias = painel.pendencias_abertas ?? 0
  if (pendencias > 0) partes.push(`${pendencias} pendência(s)`)
  return partes.join(' · ')
}

function OrcamentoPainelRow({
  editavel,
  orcamentoId,
  painel,
  processando,
  onAbrirConfigurador,
  onSincronizar,
}: Readonly<{
  editavel: boolean
  orcamentoId: string
  painel: OrcamentoConfiguradorPainelDto
  processando: boolean
  onAbrirConfigurador: () => void
  onSincronizar: () => void
}>) {
  const pendenciasAbertas = painel.pendencias_abertas ?? 0
  const bloqueadoPorPendencia = Boolean(painel.projeto_configurador_id) && pendenciasAbertas > 0
  const situacao = rotuloSituacaoPainel(painel)

  return (
    <tr>
      <td>
        <span className="fw-semibold">{painel.descricao_painel}</span>
        <span className="d-md-none small text-muted d-block">{situacao}</span>
      </td>
      <td className="d-none d-md-table-cell small text-muted">{situacao}</td>
      <td className="text-end">
        <div className="d-flex flex-wrap justify-content-end gap-1">
          {editavel && painel.modo === 'ATIVO' && !painel.projeto_configurador_id ? (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={processando}
              onClick={onAbrirConfigurador}
            >
              Configurar painel
            </button>
          ) : null}
          {painel.projeto_configurador_id ? (
            <Link
              className="btn btn-sm btn-outline-secondary"
              to={configuradorFluxoOrcamentoPath(
                configuradorPaths.composicao(painel.projeto_configurador_id),
                { orcamentoId, vinculoId: painel.id }
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
                  ? `Resolva as ${pendenciasAbertas} pendência(s) na composição antes de importar.`
                  : 'Importar itens da composição para a proposta'
              }
              onClick={onSincronizar}
            >
              Sincronizar composição
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}
