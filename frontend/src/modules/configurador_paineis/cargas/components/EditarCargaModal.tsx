/** Painel (janela) para editar carga sem sair da listagem. */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { useToast } from '@/components/feedback'
import { useProjetoListQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from './CargaForm'
import CargaModeloOpcionalSection from './CargaModeloOpcionalSection'
import { EDITAR_CARGA_FORM_ID } from './novaCargaFormIds'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { useUpdateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData, CargaModelo } from '../types/carga'
import { applyTipoChange } from '../utils/cargaFormDefaults'
import { cargaDetailToForm } from '../utils/cargaDetailToForm'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import {
  filtrarProjetosComEdicaoCargas,
  projetoPermiteEdicaoCargas,
} from '../utils/projetoEdicaoCargas'

type Props = Readonly<{
  show: boolean
  cargaId: string
  projetoId: string
  onClose: () => void
  onUpdated?: () => void
}>

type DrawerTab = 'modelo' | 'dados'

/** Mescla o payload de um modelo salvo sobre o rascunho atual do formulário. */
function aplicarPayloadModeloCarga(formDraft: CargaFormData, modelo: CargaModelo): CargaFormData {
  const next = applyTipoChange(formDraft, modelo.tipo)
  const payload = modelo.payload as Record<string, unknown>
  if (typeof payload.quantidade === 'number') {
    next.quantidade = payload.quantidade
  }
  if (payload.motor && next.motor) next.motor = payload.motor as typeof next.motor
  if (payload.valvula && next.valvula) next.valvula = payload.valvula as typeof next.valvula
  if (payload.resistencia && next.resistencia) {
    next.resistencia = payload.resistencia as typeof next.resistencia
  }
  if (payload.sensor && next.sensor) next.sensor = payload.sensor as typeof next.sensor
  if (payload.transdutor && next.transdutor) {
    next.transdutor = payload.transdutor as typeof next.transdutor
  }
  next.descricao = modelo.nome
  return next
}

type PodeEditarCargaArgs = {
  carregando: boolean
  isLoadError: boolean
  temFormSeed: boolean
  qtdProjetosEditaveis: number
  edicaoBloqueada: boolean
  cargaProjeto: string | undefined
  projetoId: string
}

function calcularPodeEditarCarga({
  carregando,
  isLoadError,
  temFormSeed,
  qtdProjetosEditaveis,
  edicaoBloqueada,
  cargaProjeto,
  projetoId,
}: PodeEditarCargaArgs): boolean {
  return (
    !carregando &&
    !isLoadError &&
    temFormSeed &&
    qtdProjetosEditaveis > 0 &&
    !edicaoBloqueada &&
    cargaProjeto === projetoId
  )
}

type EditarCargaBodyProps = Readonly<{
  carregando: boolean
  isLoadError: boolean
  loadQueryError: unknown
  edicaoBloqueada: boolean
  carga: { projeto?: string } | null | undefined
  projetoId: string
  cargaId: string
  podeEditar: boolean
  activeTab: DrawerTab
  formSeed: CargaFormData | null
  projetosEditaveis: ReturnType<typeof filtrarProjetosComEdicaoCargas>
  hrefGerenciarModelos: string
  updatePending: boolean
  onAplicarModelo: (modelo: CargaModelo) => void
  onSubmit: (data: CargaFormData) => Promise<void>
  onChangeDraft: (data: CargaFormData) => void
  onClose: () => void
  onRefetch: () => void
}>

function EditarCargaBody({
  carregando,
  isLoadError,
  loadQueryError,
  edicaoBloqueada,
  carga,
  projetoId,
  cargaId,
  podeEditar,
  activeTab,
  formSeed,
  projetosEditaveis,
  hrefGerenciarModelos,
  updatePending,
  onAplicarModelo,
  onSubmit,
  onChangeDraft,
  onClose,
  onRefetch,
}: EditarCargaBodyProps) {
  const mensagemErroCarga =
    loadQueryError instanceof Error
      ? loadQueryError.message
      : 'Não foi possível carregar esta carga.'
  const cargaDeOutroProjeto = Boolean(carga) && carga?.projeto !== projetoId

  return (
    <div className="nova-carga-drawer__body">
      {carregando ? <p className="text-muted small mb-0">Carregando…</p> : null}

      {!carregando && isLoadError ? (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <p className="text-danger small mb-0">{mensagemErroCarga}</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={onRefetch}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {!carregando && !isLoadError && edicaoBloqueada ? (
        <div className="alert alert-secondary mb-0 py-2 small" role="alert">
          Esta carga pertence a um projeto finalizado e não pode ser alterada.{' '}
          <Link to={configuradorPaths.cargaDetalhe(cargaId)} onClick={onClose}>
            Ver detalhes
          </Link>
        </div>
      ) : null}

      {!carregando && !isLoadError && cargaDeOutroProjeto ? (
        <div className="alert alert-warning mb-0 py-2 small" role="alert">
          A carga não pertence à configuração selecionada na listagem.
        </div>
      ) : null}

      {podeEditar && activeTab === 'modelo' ? (
        <div className="nova-carga-drawer__modelo-pane">
          <p className="small text-muted mb-3">
            Busque um modelo pré-cadastrado para preencher o formulário automaticamente.
          </p>
          <CargaModeloOpcionalSection
            modeloQueryScope="edit"
            onAplicarModelo={onAplicarModelo}
            compact
            gerenciarModelosHref={hrefGerenciarModelos}
          />
        </div>
      ) : null}

      {podeEditar && activeTab === 'dados' && formSeed ? (
        <CargaForm
          key={`${cargaId}-form`}
          projetos={projetosEditaveis}
          initialData={formSeed}
          onChange={onChangeDraft}
          onSubmit={onSubmit}
          loading={updatePending}
          lockProjeto
          hideProjetoField
          hideOptionalFields
          layout="panel"
          formId={EDITAR_CARGA_FORM_ID}
          hideFooterSubmit
        />
      ) : null}
    </div>
  )
}

export function EditarCargaModal({ show, cargaId, projetoId, onClose, onUpdated }: Props) {
  const { showToast } = useToast()
  const [searchParams] = useSearchParams()
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetosEditaveis = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )

  const {
    data: carga,
    isPending: loadingCarga,
    isError: isLoadError,
    error: loadQueryError,
    refetch,
  } = useCargaDetailQuery(show ? cargaId : undefined)

  const updateMutation = useUpdateCargaMutation()
  const [activeTab, setActiveTab] = useState<DrawerTab>('dados')
  const [formSeed, setFormSeed] = useState<CargaFormData | null>(null)
  const [formDraft, setFormDraft] = useState<CargaFormData | null>(null)

  const hrefGerenciarModelos = useMemo(
    () => withFluxoOrigem(configuradorPaths.modelosCargas, searchParams),
    [searchParams]
  )

  const initialData = useMemo(() => {
    if (!carga) return null
    return cargaDetailToForm(carga)
  }, [carga])

  useEffect(() => {
    if (!show) return
    setActiveTab('dados')
  }, [show, cargaId])

  useEffect(() => {
    if (!initialData) return
    setFormSeed(initialData)
    setFormDraft(initialData)
  }, [initialData])

  useEffect(() => {
    if (!show) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !updateMutation.isPending) onClose()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [show, onClose, updateMutation.isPending])

  const projetoDaCarga = useMemo(
    () => projetos.find((p) => p.id === (carga?.projeto ?? projetoId)),
    [projetos, carga?.projeto, projetoId]
  )
  const edicaoBloqueada = carga != null && !projetoPermiteEdicaoCargas(projetoDaCarga)

  const resumoCarga = useMemo(() => {
    const tag = formDraft?.tag.trim() ?? ''
    const desc = formDraft?.descricao.trim() ?? ''
    if (tag && desc) return `${tag} · ${desc}`
    return tag || desc || 'Carregando dados da carga…'
  }, [formDraft?.tag, formDraft?.descricao])

  const aplicarModelo = useCallback(
    (modelo: CargaModelo) => {
      if (!formDraft) return
      const next = aplicarPayloadModeloCarga(formDraft, modelo)
      setFormSeed({ ...next })
      setFormDraft(next)
      setActiveTab('dados')
      showToast({
        variant: 'success',
        message: `Modelo "${modelo.nome}" aplicado.`,
      })
    },
    [formDraft, showToast]
  )

  async function handleSubmit(data: CargaFormData) {
    if (!cargaId) return
    if (edicaoBloqueada) {
      showToast({
        variant: 'warning',
        message: 'Não é possível alterar cargas de projeto finalizado.',
      })
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: cargaId,
        body: cargaFormToApiPayload(data),
      })
      showToast({ variant: 'success', message: 'Carga atualizada com sucesso.' })
      onUpdated?.()
      onClose()
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: extrairMensagemErroApi(err) || 'Verifique os dados e tente novamente.',
      })
    }
  }

  if (!show) return null

  const carregando = loadingProjetos || loadingCarga
  const podeEditar = calcularPodeEditarCarga({
    carregando,
    isLoadError,
    temFormSeed: Boolean(formSeed),
    qtdProjetosEditaveis: projetosEditaveis.length,
    edicaoBloqueada,
    cargaProjeto: carga?.projeto,
    projetoId,
  })

  return (
    <div className="nova-carga-drawer" role="presentation">
      <button
        type="button"
        className="nova-carga-drawer__backdrop"
        aria-label="Fechar painel"
        disabled={updateMutation.isPending}
        onClick={onClose}
      />
      <aside
        className="nova-carga-drawer__panel nova-carga-drawer__panel--static"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-carga-drawer-title"
      >
        <header className="nova-carga-drawer__header">
          <div className="min-w-0 flex-grow-1">
            <h2 id="editar-carga-drawer-title" className="h5 mb-0">
              Editar carga
            </h2>
            <p className="small text-muted mb-0 text-truncate">{resumoCarga}</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            {podeEditar ? (
              <>
                <Link
                  to={hrefGerenciarModelos}
                  className="btn btn-outline-secondary btn-sm d-none d-sm-inline-flex"
                  onClick={onClose}
                >
                  Modelos
                </Link>
                <button
                  type="submit"
                  form={EDITAR_CARGA_FORM_ID}
                  className="btn btn-success btn-sm"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={updateMutation.isPending}
              aria-label="Fechar"
            />
          </div>
        </header>

        {podeEditar ? (
          <div className="nova-carga-drawer__tabs" role="tablist" aria-label="Origem da carga">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'modelo'}
              className={`nova-carga-drawer__tab${activeTab === 'modelo' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('modelo')}
            >
              Modelo salvo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dados'}
              className={`nova-carga-drawer__tab${activeTab === 'dados' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('dados')}
            >
              Dados da carga
            </button>
          </div>
        ) : null}

        <EditarCargaBody
          carregando={carregando}
          isLoadError={isLoadError}
          loadQueryError={loadQueryError}
          edicaoBloqueada={edicaoBloqueada}
          carga={carga}
          projetoId={projetoId}
          cargaId={cargaId}
          podeEditar={podeEditar}
          activeTab={activeTab}
          formSeed={formSeed}
          projetosEditaveis={projetosEditaveis}
          hrefGerenciarModelos={hrefGerenciarModelos}
          updatePending={updateMutation.isPending}
          onAplicarModelo={aplicarModelo}
          onSubmit={handleSubmit}
          onChangeDraft={setFormDraft}
          onClose={onClose}
          onRefetch={() => void refetch()}
        />
      </aside>
    </div>
  )
}
