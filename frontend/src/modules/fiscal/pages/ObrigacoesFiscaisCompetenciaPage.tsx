import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ChangeEvent, useCallback, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ConfirmModal, useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'

import { HoleriteRhEditModal } from '../components/HoleriteRhEditModal'
import { ObrigacaoFiscalEditModal } from '../components/ObrigacaoFiscalEditModal'
import { ReconciliacaoContabilidadeEditModal } from '../components/ReconciliacaoContabilidadeEditModal'
import { fiscalPaths } from '../fiscalPaths'
import { fiscalQueryKeys } from '../fiscalQueryKeys'
import {
  atualizarHoleriteCompetencia,
  atualizarContabilidadeReconciliacao,
  atualizarObrigacaoFiscal,
  conciliarHoleritesRhPacote,
  criarColaboradoresHoleritesPacote,
  excluirAnexoObrigacaoFiscal,
  excluirTodosAnexosPacote,
  marcarObrigacaoPaga,
  obterPacoteObrigacao,
  reconciliarPacote,
  uploadLotePacote,
  type HoleriteCompetenciaDto,
  type ObrigacaoFiscalDto,
  type ReconciliacaoFiscalDto,
  type StatusReconciliacaoFiscal,
} from '../services/fiscalObrigacoesService'
import { formatCompetencia, formatDataIso, formatMoedaBrl } from '../utils/fiscalDisplay'
import { obrigacaoDasDoPdf } from '../utils/obrigacaoDas'

type ExcluirAnexoAlvo = {
  readonly publicId: string
  readonly label: string
}

function badgeReconciliacao(status: StatusReconciliacaoFiscal): string {
  if (status === 'OK') return 'success'
  if (status === 'ALERTA') return 'warning text-dark'
  if (status === 'ERRO') return 'danger'
  return 'secondary'
}

function corBadgeStatusObrigacao(status: string): string {
  if (status === 'PAGO') return 'success'
  if (status === 'VENCIDO') return 'danger'
  return 'secondary'
}

type HoleriteInssConciliacao = {
  readonly nome?: string
  readonly colaborador?: string
  readonly inss?: string
}

function holeritesInssConciliacao(detalhes: Record<string, unknown>): readonly HoleriteInssConciliacao[] {
  const raw = detalhes.holerites
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is HoleriteInssConciliacao => item != null && typeof item === 'object')
}

function resumoHoleritesConciliacao(detalhes: Record<string, unknown>): string | null {
  const validos = detalhes.holerites_validos
  const total = detalhes.holerites_total
  if (typeof validos !== 'number' || typeof total !== 'number') return null
  return `${validos} holerite(s) na soma (de ${total} importado(s))`
}

function badgeHoleriteRh(vinculo: HoleriteCompetenciaDto['vinculo_rh']): string {
  if (vinculo === 'VINCULADO') return 'success'
  if (vinculo === 'SUGESTAO') return 'info text-dark'
  return 'warning text-dark'
}

function labelHoleriteRh(h: HoleriteCompetenciaDto): string {
  if (h.vinculo_rh === 'VINCULADO') return h.colaborador_nome || h.colaborador_matricula
  if (h.vinculo_rh === 'SUGESTAO') return `Sugerido: ${h.colaborador_sugerido_nome}`
  return 'Pendente'
}

function formatValorHolerite(
  h: HoleriteCompetenciaDto,
  campo: 'proventos' | 'desconto_inss' | 'fgts_mes',
): string {
  if (h.valores_aplicados) return formatMoedaBrl(h[campo])
  return '—'
}

function dicaReconciliacao(tipo: ReconciliacaoFiscalDto['tipo']): string | null {
  if (tipo === 'INSS') {
    return 'Coluna ERP = soma INSS dos holerites. Coluna Contabilidade = guia DARF INSS (PDF separado do DAS).'
  }
  if (tipo === 'DAS_INSS') {
    return 'Coluna Contabilidade = linha 1006 do PDF Simples Nacional (INSS patronal + empregado no DAS).'
  }
  if (tipo === 'DAS') {
    return 'Coluna ERP = projeção NF-es. Coluna Contabilidade = valor total do PDF Simples Nacional.'
  }
  if (tipo === 'ICMS') {
    return 'Colunas principais = saídas (NF-e emitidas × valor contábil saídas na DIME). Entradas no detalhe abaixo.'
  }
  return null
}

function resumoIcmsConciliacao(detalhes: Record<string, unknown>): string | null {
  const nfEnt = detalhes.nf_entradas_total
  const nfSai = detalhes.nf_saidas_total
  const dimeEnt = detalhes.dime_entradas
  const dimeSai = detalhes.dime_saidas
  if (typeof nfEnt !== 'string' || typeof nfSai !== 'string') return null
  const fmt = (v: unknown) => (typeof v === 'string' ? formatMoedaBrl(v) : '—')
  return `Entradas NF-e ${formatMoedaBrl(nfEnt)} × DIME ${fmt(dimeEnt)} · Saídas NF-e ${formatMoedaBrl(nfSai)} × DIME ${fmt(dimeSai)}`
}

function ReconciliacaoTable({
  items,
  podeEditar,
  onEditarContabilidade,
}: {
  readonly items: readonly ReconciliacaoFiscalDto[]
  readonly podeEditar: boolean
  readonly onEditarContabilidade: (item: ReconciliacaoFiscalDto) => void
}) {
  if (items.length === 0) {
    return <p className="text-muted small mb-0">Execute a conciliação após importar os PDFs.</p>
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Tipo</th>
            <th className="text-end">ERP</th>
            <th className="text-end">Contabilidade</th>
            <th className="text-end">Diff</th>
            <th>Status</th>
            {podeEditar ? <th className="text-end" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <ReconciliacaoRow
              key={r.tipo}
              r={r}
              podeEditar={podeEditar}
              onEditarContabilidade={onEditarContabilidade}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReconciliacaoAcaoEditar({
  r,
  onEditarContabilidade,
}: Readonly<{
  r: ReconciliacaoFiscalDto
  onEditarContabilidade: (item: ReconciliacaoFiscalDto) => void
}>) {
  if (r.tipo === 'PACOTE') return null
  if (r.editavel) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={() => onEditarContabilidade(r)}
      >
        {r.valor_contabilidade == null ? 'Informar' : 'Editar'}
      </button>
    )
  }
  return (
    <span className="small text-muted" title="Valor definido pelo PDF importado">
      PDF
    </span>
  )
}

function ReconciliacaoRow({
  r,
  podeEditar,
  onEditarContabilidade,
}: Readonly<{
  r: ReconciliacaoFiscalDto
  podeEditar: boolean
  onEditarContabilidade: (item: ReconciliacaoFiscalDto) => void
}>) {
  const holeritesInss = holeritesInssConciliacao(r.detalhes)
  const resumoHolerites = resumoHoleritesConciliacao(r.detalhes)
  const dica = dicaReconciliacao(r.tipo)
  const codigoDas = r.detalhes.codigo_das
  const resumoIcms = r.tipo === 'ICMS' ? resumoIcmsConciliacao(r.detalhes) : null
  return (
    <tr>
      <td>
        <div>{r.tipo_label}</div>
        <div className="small text-muted">{r.mensagem}</div>
        {dica && <div className="small text-info">{dica}</div>}
        {resumoIcms && <div className="small text-muted">{resumoIcms}</div>}
        {typeof codigoDas === 'string' && (
          <div className="small text-muted">Código DAS: {codigoDas}</div>
        )}
        {resumoHolerites && <div className="small text-muted">{resumoHolerites}</div>}
        {holeritesInss.length > 0 && (
          <ul className="small text-muted mb-0 ps-3 mt-1">
            {holeritesInss.map((h, index) => (
              <li key={`${h.nome ?? h.colaborador ?? 'h'}-${index}`}>
                {h.colaborador || h.nome || '—'}: {formatMoedaBrl(h.inss ?? null)}
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="text-end">{formatMoedaBrl(r.valor_interno)}</td>
      <td className="text-end">
        {formatMoedaBrl(r.valor_contabilidade)}
        {r.fonte_contabilidade === 'manual' && <div className="small text-muted">manual</div>}
      </td>
      <td className="text-end">{formatMoedaBrl(r.diferenca)}</td>
      <td>
        <span className={`badge bg-${badgeReconciliacao(r.status)}`}>{r.status_label}</span>
      </td>
      {podeEditar && (
        <td className="text-end">
          <ReconciliacaoAcaoEditar r={r} onEditarContabilidade={onEditarContabilidade} />
        </td>
      )}
    </tr>
  )
}

/** Detalhe de uma competência: upload PDFs, obrigações, conciliação, pagamentos. */
export default function ObrigacoesFiscaisCompetenciaPage() {
  const { id: publicId = '' } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [obrigacaoEmEdicao, setObrigacaoEmEdicao] = useState<ObrigacaoFiscalDto | null>(null)
  const [reconciliacaoEmEdicao, setReconciliacaoEmEdicao] =
    useState<ReconciliacaoFiscalDto | null>(null)
  const [holeriteEmEdicao, setHoleriteEmEdicao] = useState<HoleriteCompetenciaDto | null>(null)
  const [anexoEmExclusao, setAnexoEmExclusao] = useState<ExcluirAnexoAlvo | null>(null)
  const [confirmarExcluirTodosAnexos, setConfirmarExcluirTodosAnexos] = useState(false)
  const podeEditar = hasPermission(user, PERMISSION_KEYS.FISCAL_EDITAR)

  const { data, isPending, isError } = useQuery({
    queryKey: fiscalQueryKeys.obrigacaoPacote(publicId),
    queryFn: () => obterPacoteObrigacao(publicId),
    enabled: publicId.length > 0,
  })

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadLotePacote(publicId, files),
    onSuccess: (res) => {
      const pendentes = res.pacote.holerites.filter((h) => !h.valores_aplicados).length
      showToast({
        variant: 'success',
        title: 'Importação concluída',
        message:
          pendentes > 0
            ? `${res.importados} arquivo(s) processado(s). ${pendentes} holerite(s) aguardam vínculo com o RH.`
            : `${res.importados} arquivo(s) processado(s).`,
      })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacoesDashboard })
    },
    onError: () => {
      showToast({ variant: 'danger', title: 'Falha na importação', message: 'Verifique os PDFs.' })
    },
  })

  const reconciliarMutation = useMutation({
    mutationFn: () => reconciliarPacote(publicId),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Conciliação atualizada', message: '' })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
  })

  const pagarMutation = useMutation({
    mutationFn: (obrigacaoId: string) => marcarObrigacaoPaga(obrigacaoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacoesDashboard })
    },
  })

  const editarContabilidadeMutation = useMutation({
    mutationFn: ({
      tipo,
      payload,
    }: {
      tipo: string
      payload: Parameters<typeof atualizarContabilidadeReconciliacao>[2]
    }) => atualizarContabilidadeReconciliacao(publicId, tipo, payload),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Contabilidade atualizada', message: '' })
      setReconciliacaoEmEdicao(null)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
    onError: () => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: 'Verifique o valor informado.',
      })
    },
  })

  const editarMutation = useMutation({
    mutationFn: ({
      obrigacaoId,
      payload,
    }: {
      obrigacaoId: string
      payload: Parameters<typeof atualizarObrigacaoFiscal>[1]
    }) => atualizarObrigacaoFiscal(obrigacaoId, payload),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Obrigação atualizada', message: '' })
      setObrigacaoEmEdicao(null)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacoesDashboard })
    },
    onError: () => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: 'Verifique os valores informados.',
      })
    },
  })

  const excluirAnexoMutation = useMutation({
    mutationFn: (anexoId: string) => excluirAnexoObrigacaoFiscal(anexoId),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Anexo excluído', message: '' })
      setAnexoEmExclusao(null)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
    onError: () => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir o anexo',
        message: 'Tente novamente.',
      })
    },
  })

  const excluirTodosAnexosMutation = useMutation({
    mutationFn: () => excluirTodosAnexosPacote(publicId),
    onSuccess: (res) => {
      showToast({
        variant: 'success',
        title: 'Anexos excluídos',
        message:
          res.excluidos > 0
            ? `${res.excluidos} arquivo(s) removido(s).`
            : 'Nenhum anexo para excluir.',
      })
      setConfirmarExcluirTodosAnexos(false)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
    onError: () => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível excluir os anexos',
        message: 'Tente novamente.',
      })
    },
  })

  const holeritesPendentesRh =
    data?.holerites.filter((h) => !h.valores_aplicados).length ?? 0

  const conciliarRhMutation = useMutation({
    mutationFn: () => conciliarHoleritesRhPacote(publicId),
    onSuccess: (res) => {
      showToast({
        variant: res.pendentes_count > 0 ? 'warning' : 'success',
        title: 'Conciliação RH concluída',
        message:
          res.pendentes_count > 0
            ? `${res.vinculados}/${res.total} vinculados. ${res.pendentes_count} pendente(s).`
            : `${res.vinculados} holerite(s) vinculado(s) ao RH.`,
      })
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
  })

  const criarColaboradoresRhMutation = useMutation({
    mutationFn: (holeriteId?: number) => criarColaboradoresHoleritesPacote(publicId, holeriteId),
    onSuccess: (res) => {
      showToast({
        variant: 'success',
        title: 'Colaboradores atualizados',
        message: `${res.criados} criado(s), ${res.vinculados} vinculado(s).`,
      })
      queryClient.setQueryData(fiscalQueryKeys.obrigacaoPacote(publicId), res.pacote)
      if (holeriteEmEdicao) {
        const atualizado = res.pacote.holerites.find((h) => h.id === holeriteEmEdicao.id)
        if (atualizado) setHoleriteEmEdicao(atualizado)
      }
    },
  })

  const editarHoleriteMutation = useMutation({
    mutationFn: ({
      holeriteId,
      payload,
    }: {
      holeriteId: number
      payload: Parameters<typeof atualizarHoleriteCompetencia>[1]
    }) => atualizarHoleriteCompetencia(holeriteId, payload),
    onSuccess: () => {
      showToast({ variant: 'success', title: 'Holerite atualizado', message: '' })
      setHoleriteEmEdicao(null)
      void queryClient.invalidateQueries({ queryKey: fiscalQueryKeys.obrigacaoPacote(publicId) })
    },
    onError: () => {
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar o holerite',
        message: 'Verifique os dados informados.',
      })
    },
  })

  const onFilesSelected = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (files.length === 0) return
      uploadMutation.mutate(files)
      e.target.value = ''
    },
    [uploadMutation],
  )

  const fecharModalExclusaoAnexo = useCallback(() => {
    if (!excluirAnexoMutation.isPending) setAnexoEmExclusao(null)
  }, [excluirAnexoMutation.isPending])

  const fecharModalExcluirTodosAnexos = useCallback(() => {
    if (!excluirTodosAnexosMutation.isPending) setConfirmarExcluirTodosAnexos(false)
  }, [excluirTodosAnexosMutation.isPending])

  const confirmarExclusaoAnexo = useCallback(async () => {
    if (!anexoEmExclusao) return
    await excluirAnexoMutation.mutateAsync(anexoEmExclusao.publicId)
  }, [anexoEmExclusao, excluirAnexoMutation])

  if (!publicId) {
    return (
      <div className="container-fluid">
        <div className="alert alert-warning">Competência inválida.</div>
      </div>
    )
  }

  return (
    <div className="container-fluid">
      <ConfirmModal
        show={confirmarExcluirTodosAnexos}
        title="Excluir todos os anexos"
        message={
          data
            ? `Deseja excluir os ${data.anexos.length} PDF(s) desta competência? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Confirmar exclusão de todos"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={excluirTodosAnexosMutation.isPending}
        onCancel={fecharModalExcluirTodosAnexos}
        onConfirm={() => void excluirTodosAnexosMutation.mutateAsync()}
      />
      <ConfirmModal
        show={anexoEmExclusao !== null}
        title="Excluir anexo"
        message={
          anexoEmExclusao
            ? `Deseja realmente excluir "${anexoEmExclusao.label}"? Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isConfirming={excluirAnexoMutation.isPending}
        onCancel={fecharModalExclusaoAnexo}
        onConfirm={() => void confirmarExclusaoAnexo()}
      />
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0">
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.home}>Fiscal</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to={fiscalPaths.obrigacoes}>Obrigações</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {data ? formatCompetencia(data.competencia) : '…'}
          </li>
        </ol>
      </nav>

      {isPending && <p className="text-muted">Carregando…</p>}
      {isError && <div className="alert alert-danger">Não foi possível carregar a competência.</div>}

      {data && (
        <>
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-4">
            <div>
              <h1 className="h3 mb-1">Competência {formatCompetencia(data.competencia)}</h1>
              <p className="text-muted mb-0">
                {data.pacote_completo ? (
                  <span className="badge bg-success">Pacote completo</span>
                ) : (
                  <span className="badge bg-warning text-dark">Pacote incompleto</span>
                )}
              </p>
            </div>
            {podeEditar && (
              <div className="d-flex flex-wrap gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="d-none"
                  onChange={onFilesSelected}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={uploadMutation.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploadMutation.isPending ? 'Importando…' : 'Importar PDFs da contabilidade'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  disabled={reconciliarMutation.isPending}
                  onClick={() => reconciliarMutation.mutate()}
                >
                  Conciliar
                </button>
              </div>
            )}
          </div>

          <h2 className="h5 mb-3">Obrigações</h2>
          <div className="table-responsive mb-4">
            <table className="table table-sm table-hover align-middle">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Descrição</th>
                  <th className="text-end">Valor</th>
                  <th className="text-end">Estimado ERP</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.obrigacoes.flatMap((o) => {
                  const rows = [
                    <tr key={o.public_id}>
                      <td>{o.tipo_label}</td>
                      <td>{o.descricao}</td>
                      <td className="text-end">{formatMoedaBrl(o.valor)}</td>
                      <td className="text-end">{formatMoedaBrl(o.valor_estimado)}</td>
                      <td>{formatDataIso(o.data_vencimento)}</td>
                      <td>
                        <span
                          className={`badge bg-${corBadgeStatusObrigacao(o.status)}`}
                        >
                          {o.status_label}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="d-flex flex-wrap justify-content-end gap-1">
                          {podeEditar && o.status !== 'PAGO' && o.status !== 'CANCELADO' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={editarMutation.isPending}
                              onClick={() => setObrigacaoEmEdicao(o)}
                            >
                              {(() => {
                                if (obrigacaoDasDoPdf(o)) return 'Observações'
                                if (o.tipo === 'DAS') return 'Informar DAS'
                                return 'Editar'
                              })()}
                            </button>
                          )}
                          {podeEditar && o.status === 'PENDENTE' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              disabled={pagarMutation.isPending}
                              onClick={() => pagarMutation.mutate(o.public_id)}
                            >
                              Marcar pago
                            </button>
                          )}
                          {o.lancamento_financeiro && (
                            <span className="small text-muted align-self-center">Lanç. financeiro</span>
                          )}
                        </div>
                      </td>
                    </tr>,
                  ]
                  if (o.linhas_composicao.length > 0) {
                    rows.push(
                      <tr key={`${o.public_id}-comp`} className="table-light">
                        <td colSpan={7} className="py-2">
                          <div className="small text-muted mb-1">
                            {obrigacaoDasDoPdf(o)
                              ? 'Composição do PDF Simples Nacional (códigos 1001–1008)'
                              : 'Composição informada manualmente'}
                          </div>
                          <div className="table-responsive">
                            <table className="table table-sm mb-0">
                              <thead>
                                <tr>
                                  <th>Código</th>
                                  <th>Tributo</th>
                                  <th className="text-end">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {o.linhas_composicao.map((linha) => (
                                  <tr key={`${o.public_id}-${linha.id}`}>
                                    <td>{linha.codigo}</td>
                                    <td>{linha.descricao}</td>
                                    <td className="text-end">{formatMoedaBrl(linha.valor)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>,
                    )
                  }
                  return rows
                })}
              </tbody>
            </table>
          </div>

          {data.holerites.length > 0 && (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h2 className="h5 mb-0">Holerites importados</h2>
                {podeEditar && (
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      disabled={conciliarRhMutation.isPending}
                      onClick={() => conciliarRhMutation.mutate()}
                    >
                      {conciliarRhMutation.isPending ? 'Conciliando…' : 'Vincular ao RH'}
                    </button>
                    {holeritesPendentesRh > 0 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={criarColaboradoresRhMutation.isPending}
                        onClick={() => criarColaboradoresRhMutation.mutate(undefined)}
                      >
                        {criarColaboradoresRhMutation.isPending
                          ? 'Criando…'
                          : `Criar ${holeritesPendentesRh} no RH`}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {holeritesPendentesRh > 0 && (
                <p className="text-muted small">
                  {holeritesPendentesRh} holerite(s) sem colaborador vinculado ou com parse incerto.
                  Clique <strong>Editar</strong>, selecione o colaborador correto no RH e salve — só
                  então os valores entram na conciliação INSS/FGTS.
                </p>
              )}
              <div className="table-responsive mb-4">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Colaborador RH</th>
                      <th className="text-end">Proventos</th>
                      <th className="text-end">INSS</th>
                      <th className="text-end">FGTS</th>
                      {podeEditar && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {data.holerites.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <div>{h.nome}</div>
                          {h.aviso_rh && (
                            <div className="small text-muted">{h.aviso_rh}</div>
                          )}
                        </td>
                        <td>
                          <span className={`badge bg-${badgeHoleriteRh(h.vinculo_rh)}`}>
                            {labelHoleriteRh(h)}
                          </span>
                        </td>
                        <td className="text-end">{formatValorHolerite(h, 'proventos')}</td>
                        <td className="text-end">{formatValorHolerite(h, 'desconto_inss')}</td>
                        <td className="text-end">{formatValorHolerite(h, 'fgts_mes')}</td>
                        {podeEditar && (
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => setHoleriteEmEdicao(h)}
                            >
                              Editar
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 className="h5 mb-3">Conciliação ERP × contabilidade</h2>
          {(() => {
            const temDasPdf = data.obrigacoes.some((o) => obrigacaoDasDoPdf(o))
            const simplesEscaneado = data.anexos.some(
              (a) =>
                (a.nome_original?.toLowerCase().includes('simples nacional') ||
                  a.tipo_arquivo === 'SIMPLES') &&
                !a.parse_sucesso,
            )
            const temDarfInss = data.obrigacoes.some(
              (o) => o.tipo === 'INSS_DARF' && Number(o.valor) > 0,
            )
            const temHoleritesInss = data.holerites.some((h) => h.valores_aplicados)
            const pendencias: string[] = []
            if (simplesEscaneado) {
              pendencias.push(
                'PDF do DAS escaneado — clique em Obrigações → Informar DAS e preencha valor total e INSS (cód. 1006).',
              )
            } else if (!temDasPdf) {
              pendencias.push(
                'PDF do DAS (Simples Nacional) — valor total e composição (cód. 1006 INSS)',
              )
            }
            if (temHoleritesInss && !temDarfInss) {
              pendencias.push('PDF da guia DARF INSS — conferência com soma INSS dos holerites')
            }
            const recIcms = data.reconciliacoes.find((r) => r.tipo === 'ICMS')
            if (recIcms && recIcms.valor_contabilidade == null) {
              pendencias.push('PDF da DIME ICMS — valores contábeis de entradas e saídas')
            }
            if (pendencias.length === 0) return null
            return (
              <output className="alert alert-info py-2 small mb-3 d-block">
                <strong>PDFs pendentes para conciliação completa:</strong>
                <ul className="mb-0 mt-1">
                  {pendencias.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </output>
            )
          })()}
          <div className="card mb-4">
            <div className="card-body">
              <ReconciliacaoTable
                items={data.reconciliacoes}
                podeEditar={podeEditar}
                onEditarContabilidade={setReconciliacaoEmEdicao}
              />
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <h2 className="h5 mb-0">Anexos ({data.anexos.length})</h2>
            {podeEditar && data.anexos.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                disabled={
                  excluirAnexoMutation.isPending || excluirTodosAnexosMutation.isPending
                }
                onClick={() => setConfirmarExcluirTodosAnexos(true)}
              >
                Excluir todos
              </button>
            )}
          </div>
          <ul className="list-group mb-4">
            {data.anexos.map((a) => (
              <li key={a.public_id} className="list-group-item d-flex justify-content-between gap-3">
                <div>
                  <div>{a.nome_original || a.tipo_arquivo}</div>
                  <div className="small text-muted">
                    {a.parse_sucesso ? (
                      'Parse OK'
                    ) : (
                      <span className="text-warning">
                        {a.parse_erros || 'PDF escaneado ou parse parcial'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex flex-wrap align-items-start gap-2">
                  {a.arquivo_url && (
                    <a href={a.arquivo_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                      PDF
                    </a>
                  )}
                  {podeEditar && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      disabled={excluirAnexoMutation.isPending}
                      onClick={() =>
                        setAnexoEmExclusao({
                          publicId: a.public_id,
                          label: a.nome_original || a.tipo_arquivo,
                        })
                      }
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {holeriteEmEdicao && (
            <HoleriteRhEditModal
              holerite={holeriteEmEdicao}
              isSubmitting={editarHoleriteMutation.isPending}
              isCreatingColaborador={criarColaboradoresRhMutation.isPending}
              onClose={() => {
                if (!editarHoleriteMutation.isPending && !criarColaboradoresRhMutation.isPending) {
                  setHoleriteEmEdicao(null)
                }
              }}
              onSave={async (payload) => {
                await editarHoleriteMutation.mutateAsync({
                  holeriteId: holeriteEmEdicao.id,
                  payload,
                })
              }}
              onCriarColaborador={async () => {
                await criarColaboradoresRhMutation.mutateAsync(holeriteEmEdicao.id)
              }}
            />
          )}

          {reconciliacaoEmEdicao && (
            <ReconciliacaoContabilidadeEditModal
              reconciliacao={reconciliacaoEmEdicao}
              isSubmitting={editarContabilidadeMutation.isPending}
              onClose={() => {
                if (!editarContabilidadeMutation.isPending) setReconciliacaoEmEdicao(null)
              }}
              onSave={async (payload) => {
                await editarContabilidadeMutation.mutateAsync({
                  tipo: reconciliacaoEmEdicao.tipo,
                  payload,
                })
              }}
            />
          )}

          {obrigacaoEmEdicao && (
            <ObrigacaoFiscalEditModal
              obrigacao={obrigacaoEmEdicao}
              isSubmitting={editarMutation.isPending}
              onClose={() => {
                if (!editarMutation.isPending) setObrigacaoEmEdicao(null)
              }}
              onSave={async (payload) => {
                await editarMutation.mutateAsync({
                  obrigacaoId: obrigacaoEmEdicao.public_id,
                  payload,
                })
              }}
            />
          )}
        </>
      )}
    </div>
  )
}
