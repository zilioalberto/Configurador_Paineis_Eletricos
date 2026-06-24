import { useEffect, useMemo, useState, type SyntheticEvent } from 'react'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import {
  useAjustarApontamentoHoraMutation,
  useAprovarApontamentoHoraMutation,
  useAtualizarComentarioTarefaMutation,
  useCriarComentarioTarefaMutation,
  useEliminarComentarioTarefaMutation,
  useExcluirTarefaMutation,
  useRejeitarApontamentoHoraMutation,
} from '../hooks/useTarefaMutations'
import { useTarefaApontamentosQuery } from '../hooks/useTarefaApontamentosQuery'
import { useTarefaComentariosQuery } from '../hooks/useTarefaComentariosQuery'
import { useTarefaHistoricoQuery } from '../hooks/useTarefaHistoricoQuery'
import { useTarefaResponsaveisQuery } from '../hooks/useTarefaResponsaveisQuery'
import type { ColunaKanban, TarefaKanbanItem } from '../types/tarefa'
import { type TarefaFormState } from '../utils/tarefasKanbanConstants'
import {
  formatarHoras,
  horasEstipuladasFormParaApi,
  tarefaEntregue,
  tarefaToFormState,
  totalizarHoras,
} from '../utils/tarefasKanbanUtils'
import {
  ExcluirTarefaButton,
  TarefaCamposPrincipais,
  TarefaComentariosSection,
  TarefaHistoricoPanel,
  TarefaLogHorasPanel,
  TarefaTimerPanel,
} from './TarefaEditModalSections'

/** Modal de edição completa da tarefa (detalhes, checklist, apontamentos). */
export function TarefaEditModal({
  tarefa,
  colunas,
  timerAtivo,
  tempoAtivoSegundos,
  podeEditar,
  podeClassificar,
  podeAlterarClassificacaoComApontamentos,
  podeApontarHoras,
  isSubmitting,
  isSavingTime,
  onClose,
  onSaveEdicao,
  onStartTimer,
  onStopTimer,
}: Readonly<{
  tarefa: TarefaKanbanItem
  colunas: ColunaKanban[]
  timerAtivo: boolean
  tempoAtivoSegundos: number
  podeEditar: boolean
  podeClassificar: boolean
  podeAlterarClassificacaoComApontamentos: boolean
  podeApontarHoras: boolean
  isSubmitting: boolean
  isSavingTime: boolean
  onClose: () => void
  onSaveEdicao: (form: TarefaFormState) => Promise<void>
  onStartTimer: (tarefa: TarefaKanbanItem) => Promise<void>
  onStopTimer: () => Promise<void>
}>) {
  const { showToast } = useToast()
  const { user } = useAuth()
  const responsaveisQuery = useTarefaResponsaveisQuery()
  const apontamentosQuery = useTarefaApontamentosQuery(tarefa.id)
  const historicoQuery = useTarefaHistoricoQuery(tarefa.id)
  const comentariosQuery = useTarefaComentariosQuery(tarefa.id)
  const apontamentos = useMemo(
    () => apontamentosQuery.data ?? [],
    [apontamentosQuery.data]
  )
  const entregue = tarefaEntregue(tarefa)
  const podeVerOrcamentos = hasPermission(user, PERMISSION_KEYS.ORCAMENTO_VISUALIZAR)
  const podeAprovarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_APROVAR_HORAS)
  const podeAjustarHoras = hasPermission(user, PERMISSION_KEYS.TAREFA_AJUSTAR_HORAS)
  const podeExcluirTarefaKanban = hasPermission(user, PERMISSION_KEYS.TAREFA_EXCLUIR)
  const criarComentarioMutation = useCriarComentarioTarefaMutation()
  const atualizarComentarioMutation = useAtualizarComentarioTarefaMutation()
  const eliminarComentarioMutation = useEliminarComentarioTarefaMutation()
  const excluirTarefaMutation = useExcluirTarefaMutation()
  const aprovarApontamentoMutation = useAprovarApontamentoHoraMutation()
  const rejeitarApontamentoMutation = useRejeitarApontamentoHoraMutation()
  const ajustarApontamentoMutation = useAjustarApontamentoHoraMutation()
  const classificacaoBloqueada =
    apontamentos.length > 0 && !podeAlterarClassificacaoComApontamentos
  const desabilitarClassificacao = !podeClassificar || classificacaoBloqueada
  const podeSalvarAlgumCampo = podeEditar || podeClassificar
  const totalHorasApontadas = useMemo(() => {
    if (!apontamentosQuery.isPending && !apontamentosQuery.isError) {
      return totalizarHoras(apontamentos)
    }
    return tarefa.total_horas_apontadas ?? '0.00'
  }, [
    apontamentos,
    apontamentosQuery.isError,
    apontamentosQuery.isPending,
    tarefa.total_horas_apontadas,
  ])
  const [form, setForm] = useState<TarefaFormState>(() => tarefaToFormState(tarefa))
  const [textoNovoComentario, setTextoNovoComentario] = useState('')
  const [comentarioEmEdicao, setComentarioEmEdicao] = useState<{
    id: string
    texto: string
  } | null>(null)
  const [painelLogHorasAberto, setPainelLogHorasAberto] = useState(false)
  const [painelHistoricoAberto, setPainelHistoricoAberto] = useState(false)
  const [ajusteApontamentoId, setAjusteApontamentoId] = useState<string | null>(null)
  const [formAjusteApontamento, setFormAjusteApontamento] = useState({
    justificativa: '',
    horas: '',
    data: '',
  })

  useEffect(() => {
    setForm(tarefaToFormState(tarefa))
  }, [tarefa])

  const horasEstipuladasResumo = useMemo(() => {
    const v = horasEstipuladasFormParaApi(form.horas_estipuladas)
    return v ? formatarHoras(v) : '—'
  }, [form.horas_estipuladas])

  const mutacoesExtrasPendentes =
    criarComentarioMutation.isPending ||
    atualizarComentarioMutation.isPending ||
    eliminarComentarioMutation.isPending ||
    aprovarApontamentoMutation.isPending ||
    rejeitarApontamentoMutation.isPending ||
    ajustarApontamentoMutation.isPending

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === 'Escape' &&
        !isSubmitting &&
        !isSavingTime &&
        !mutacoesExtrasPendentes
      ) {
        onClose()
      }
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [isSavingTime, isSubmitting, mutacoesExtrasPendentes, onClose])

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.titulo.trim() || !form.coluna || !podeSalvarAlgumCampo) return
    await onSaveEdicao(form)
  }

  return (
    <>
      <div
        className="modal fade show d-block"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tarefa-edit-modal-title"
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable tarefa-edit-modal">
          <form className="modal-content" onSubmit={(event) => { handleSubmit(event).catch(() => undefined) }}>
            <div className="modal-header">
              <div>
                <h2 id="tarefa-edit-modal-title" className="modal-title h5 mb-0">
                  Editar tarefa
                </h2>
                <p className="text-muted small mb-0">{tarefa.status_display}</p>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={isSubmitting || isSavingTime || mutacoesExtrasPendentes}
                aria-label="Fechar"
              />
            </div>
            <div className="modal-body">
              <div className="row g-4 align-items-start">
                <div className="col-lg-7">
              <TarefaTimerPanel
                tarefa={tarefa}
                totalHorasApontadas={totalHorasApontadas}
                timerAtivo={timerAtivo}
                tempoAtivoSegundos={tempoAtivoSegundos}
                horasEstipuladasResumo={horasEstipuladasResumo}
                podeApontarHoras={podeApontarHoras}
                entregue={entregue}
                isSavingTime={isSavingTime}
                onStartTimer={onStartTimer}
                onStopTimer={onStopTimer}
              />

              <TarefaCamposPrincipais
                form={form}
                setForm={setForm}
                podeEditar={podeEditar}
                podeClassificar={podeClassificar}
                desabilitarClassificacao={desabilitarClassificacao}
                classificacaoBloqueada={classificacaoBloqueada}
                podeVerOrcamentos={podeVerOrcamentos}
                responsaveis={responsaveisQuery.data ?? []}
                responsaveisPending={responsaveisQuery.isPending}
              />
                </div>

                <div className="col-lg-5 tarefa-edit-modal__sidebar">
              <TarefaComentariosSection
                tarefaId={tarefa.id}
                comentarios={comentariosQuery.data ?? []}
                isPending={comentariosQuery.isPending}
                isError={comentariosQuery.isError}
                podeEditar={podeEditar}
                comentarioEmEdicao={comentarioEmEdicao}
                setComentarioEmEdicao={setComentarioEmEdicao}
                textoNovoComentario={textoNovoComentario}
                setTextoNovoComentario={setTextoNovoComentario}
                criarMutation={criarComentarioMutation}
                atualizarMutation={atualizarComentarioMutation}
                eliminarMutation={eliminarComentarioMutation}
                showToast={showToast}
              />

              <TarefaLogHorasPanel
                tarefaId={tarefa.id}
                apontamentos={apontamentos}
                isPending={apontamentosQuery.isPending}
                isError={apontamentosQuery.isError}
                aberto={painelLogHorasAberto}
                onAlternar={() => setPainelLogHorasAberto((aberto) => !aberto)}
                podeAprovarHoras={podeAprovarHoras}
                podeAjustarHoras={podeAjustarHoras}
                entregue={entregue}
                ajusteApontamentoId={ajusteApontamentoId}
                setAjusteApontamentoId={setAjusteApontamentoId}
                formAjusteApontamento={formAjusteApontamento}
                setFormAjusteApontamento={setFormAjusteApontamento}
                aprovarMutation={aprovarApontamentoMutation}
                rejeitarMutation={rejeitarApontamentoMutation}
                ajustarMutation={ajustarApontamentoMutation}
                showToast={showToast}
                painelId={`tarefa-${tarefa.id}-log-horas`}
              />

              <TarefaHistoricoPanel
                historico={historicoQuery.data ?? []}
                isPending={historicoQuery.isPending}
                isError={historicoQuery.isError}
                aberto={painelHistoricoAberto}
                onAlternar={() => setPainelHistoricoAberto((aberto) => !aberto)}
                colunas={colunas}
                painelId={`tarefa-${tarefa.id}-historico`}
              />
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                {podeExcluirTarefaKanban ? (
                  <ExcluirTarefaButton
                    tarefa={tarefa}
                    disabledExterno={isSubmitting || isSavingTime || mutacoesExtrasPendentes}
                    excluirMutation={excluirTarefaMutation}
                    showToast={showToast}
                    onClose={onClose}
                  />
                ) : null}
              </div>
              <div className="d-flex flex-wrap gap-2 ms-auto">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onClose}
                  disabled={isSubmitting || isSavingTime || mutacoesExtrasPendentes}
                >
                  Fechar
                </button>
                {podeSalvarAlgumCampo ? (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isSubmitting ||
                      !form.titulo.trim() ||
                      !form.coluna ||
                      mutacoesExtrasPendentes
                    }
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="modal-backdrop fade show" aria-hidden="true" />
    </>
  )
}
