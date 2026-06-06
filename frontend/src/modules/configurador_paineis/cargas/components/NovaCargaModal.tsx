/** Painel (janela) para cadastrar carga sem sair da listagem. */

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { withFluxoOrigem } from '@/modules/configurador_paineis/projetos/utils/fluxoOrigem'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useProjetoListQuery } from '@/modules/configurador_paineis/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from './CargaForm'
import { NOVA_CARGA_FORM_ID } from './novaCargaFormIds'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useCreateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData, TipoCarga } from '../types/carga'
import { cargaFormInitial } from '../utils/cargaFormDefaults'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { filtrarProjetosComEdicaoCargas } from '../utils/projetoEdicaoCargas'

type Props = Readonly<{
  show: boolean
  projetoId: string
  onClose: () => void
  onCreated?: () => void
}>

export function NovaCargaModal({ show, projetoId, onClose, onCreated }: Props) {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetosEditaveis = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )

  const createMutation = useCreateCargaMutation()
  const [formSeed, setFormSeed] = useState<CargaFormData>(() => cargaFormInitial(projetoId))
  const [formDraft, setFormDraft] = useState<CargaFormData>(() => cargaFormInitial(projetoId))

  const initialData = useMemo(() => {
    const pid =
      projetoId && projetosEditaveis.some((p) => p.id === projetoId)
        ? projetoId
        : projetosEditaveis[0]?.id || ''
    return cargaFormInitial(pid)
  }, [projetoId, projetosEditaveis])

  const hrefGerenciarModelos = useMemo(
    () => withFluxoOrigem(configuradorPaths.modelosCargas, searchParams),
    [searchParams]
  )

  useEffect(() => {
    if (!show) return
    setFormSeed(initialData)
    setFormDraft(initialData)
  }, [show, initialData])

  useEffect(() => {
    if (!show) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !createMutation.isPending) onClose()
    }

    globalThis.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      globalThis.removeEventListener('keydown', onKeyDown)
    }
  }, [show, onClose, createMutation.isPending])

  const { data: cargasProjetoAtual = [] } = useCargaListQuery(show ? formDraft.projeto || null : null)

  const proximoTagSugerido = useMemo(() => {
    const PREFIX_BY_TIPO: Record<TipoCarga, string> = {
      MOTOR: 'M',
      VALVULA: 'V',
      RESISTENCIA: 'R',
      SENSOR: 'S',
      TRANSDUTOR: 'T',
      TRANSMISSOR: 'TM',
      OUTRO: 'O',
    }
    const prefix = PREFIX_BY_TIPO[formDraft.tipo]
    if (!prefix) return ''
    const matcher = new RegExp(`^${prefix}(\\d+)$`, 'i')
    const maxSeq = cargasProjetoAtual.reduce((acc, carga) => {
      const match = matcher.exec((carga.tag ?? '').trim())
      if (!match) return acc
      const seq = Number(match[1])
      return Number.isFinite(seq) && seq > acc ? seq : acc
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
  }, [cargasProjetoAtual, formDraft.tipo])

  const resumoCarga = useMemo(() => {
    const tag = formDraft.tag.trim()
    const desc = formDraft.descricao.trim()
    if (tag && desc) return `${tag} · ${desc}`
    return tag || desc || 'Preencha os dados da carga'
  }, [formDraft.tag, formDraft.descricao])

  async function handleSubmit(data: CargaFormData) {
    if (!data.projeto) {
      showToast({
        variant: 'warning',
        message: 'Projeto inválido para cadastro de carga.',
      })
      return
    }
    if (!projetosEditaveis.some((p) => p.id === data.projeto)) {
      showToast({
        variant: 'warning',
        message: 'Não é possível cadastrar cargas em projeto finalizado.',
      })
      return
    }
    try {
      await createMutation.mutateAsync(cargaFormToApiPayload(data))
      showToast({ variant: 'success', message: 'Carga criada com sucesso.' })
      onCreated?.()
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

  const podeCadastrar = !loadingProjetos && projetosEditaveis.length > 0
  const semProjetos = !loadingProjetos && projetos.length === 0
  const todosFinalizados =
    !loadingProjetos && projetos.length > 0 && projetosEditaveis.length === 0

  return (
    <div className="nova-carga-drawer" role="presentation">
      <button
        type="button"
        className="nova-carga-drawer__backdrop"
        aria-label="Fechar painel"
        disabled={createMutation.isPending}
        onClick={onClose}
      />
      <aside
        className="nova-carga-drawer__panel nova-carga-drawer__panel--static"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nova-carga-drawer-title"
      >
        <header className="nova-carga-drawer__header">
          <div className="min-w-0 flex-grow-1">
            <h2 id="nova-carga-drawer-title" className="h5 mb-0">
              Nova carga
            </h2>
            <p className="small text-muted mb-0 text-truncate">{resumoCarga}</p>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <Link
              to={hrefGerenciarModelos}
              className="btn btn-outline-secondary btn-sm d-none d-sm-inline-flex"
              onClick={onClose}
            >
              Modelos
            </Link>
            {podeCadastrar ? (
              <button
                type="submit"
                form={NOVA_CARGA_FORM_ID}
                className="btn btn-success btn-sm"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Salvando…' : 'Salvar'}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={createMutation.isPending}
              aria-label="Fechar"
            />
          </div>
        </header>

        <div className="nova-carga-drawer__body">
          {loadingProjetos ? <p className="text-muted small mb-0">Carregando…</p> : null}

          {semProjetos ? (
            <div className="alert alert-warning mb-0 py-2 small" role="alert">
              É necessário ter pelo menos uma configuração cadastrada.
              {canCreateProjeto ? (
                <>
                  {' '}
                  <Link to={configuradorPaths.novaConfiguracao} onClick={onClose}>
                    Criar configuração
                  </Link>
                </>
              ) : null}
            </div>
          ) : null}

          {todosFinalizados ? (
            <div className="alert alert-secondary mb-0 py-2 small" role="alert">
              Todas as configurações estão finalizadas. Não é possível cadastrar novas cargas.
            </div>
          ) : null}

          {podeCadastrar ? (
            <CargaForm
              projetos={projetosEditaveis}
              initialData={formSeed}
              suggestedTag={proximoTagSugerido}
              onChange={setFormDraft}
              onSubmit={handleSubmit}
              loading={createMutation.isPending}
              lockProjeto
              hideProjetoField
              hideOptionalFields
              layout="panel"
              formId={NOVA_CARGA_FORM_ID}
              hideFooterSubmit
            />
          ) : null}
        </div>
      </aside>
    </div>
  )
}
