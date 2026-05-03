import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from '../components/CargaForm'
import CargaModeloOpcionalSection from '../components/CargaModeloOpcionalSection'
import { useCargaListQuery } from '../hooks/useCargaListQuery'
import { useCreateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData, CargaModelo, TipoCarga } from '../types/carga'
import { cargaFormInitial } from '../utils/cargaFormDefaults'
import { aplicarModeloNoFormulario } from '../utils/cargaModelos'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { filtrarProjetosComEdicaoCargas } from '../utils/projetoEdicaoCargas'

export default function CargaCreatePage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const projetoQuery = searchParams.get('projeto') ?? ''
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetosEditaveis = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )
  const canCreateProjeto = hasPermission(user, PERMISSION_KEYS.PROJETO_CRIAR)

  const createMutation = useCreateCargaMutation()
  const [formSeed, setFormSeed] = useState<CargaFormData>(() => cargaFormInitial(''))
  const [formDraft, setFormDraft] = useState<CargaFormData>(() => cargaFormInitial(''))

  const initialData = useMemo(() => {
    const fromQuery =
      projetoQuery &&
      projetosEditaveis.some((p) => p.id === projetoQuery)
        ? projetoQuery
        : ''
    const pid = fromQuery || projetosEditaveis[0]?.id || ''
    return cargaFormInitial(pid)
  }, [projetoQuery, projetosEditaveis])

  useEffect(() => {
    setFormSeed(initialData)
    setFormDraft(initialData)
  }, [initialData])

  const { data: cargasProjetoAtual = [] } = useCargaListQuery(formDraft.projeto || null)

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
      const match = matcher.exec(carga.tag.trim())
      if (!match) return acc
      const seq = Number(match[1])
      return Number.isFinite(seq) && seq > acc ? seq : acc
    }, 0)
    return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
  }, [cargasProjetoAtual, formDraft.tipo])

  const aplicarModelo = useCallback(
    (modelo: CargaModelo) => {
      const projetoId = formSeed.projeto || initialData.projeto
      if (!projetoId) return
      const next = aplicarModeloNoFormulario(projetoId, modelo.tipo, modelo.payload)
      next.descricao = modelo.nome
      setFormSeed(next)
      setFormDraft(next)
      showToast({
        variant: 'success',
        message: `Modelo "${modelo.nome}" aplicado ao formulário.`,
      })
    },
    [formSeed.projeto, initialData.projeto, showToast]
  )

  async function handleSubmit(data: CargaFormData) {
    if (!data.projeto) {
      showToast({
        variant: 'warning',
        message: 'Selecione o projeto ao qual a carga pertence.',
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
      const created = await createMutation.mutateAsync(cargaFormToApiPayload(data))
      showToast({ variant: 'success', message: 'Carga criada com sucesso.' })
      navigate(`/cargas?projeto=${encodeURIComponent(created.projeto)}`)
    } catch (err) {
      console.error(err)
      showToast({
        variant: 'danger',
        title: 'Não foi possível salvar',
        message: extrairMensagemErroApi(err) || 'Verifique os dados e tente novamente.',
      })
    }
  }

  return (
    <div className="container-fluid">
      <div className="mb-4">
        <h1 className="h3 mb-1">Nova carga</h1>
        <p className="text-muted mb-0">
          O projeto não pode ser alterado nesta tela (é o definido ao abrir o cadastro). Escolha o
          tipo de carga e complete os dados; os parâmetros específicos são preenchidos com valores
          padrão ao mudar o tipo (pode ajustar antes de salvar).
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {loadingProjetos && (
            <p className="text-muted mb-0">Carregando projetos...</p>
          )}

          {!loadingProjetos && projetos.length === 0 && (
            <div className="alert alert-warning mb-0" role="alert">
              É necessário ter pelo menos um projeto cadastrado.{' '}
              {canCreateProjeto ? <Link to="/projetos/novo">Criar projeto</Link> : null}
            </div>
          )}

          {!loadingProjetos &&
            projetos.length > 0 &&
            projetosEditaveis.length === 0 && (
              <div className="alert alert-secondary mb-0" role="alert">
                Todos os projetos estão finalizados. Não é possível cadastrar novas
                cargas até existir um projeto em andamento.{' '}
                <Link to="/projetos">Ver projetos</Link>
              </div>
            )}

          {!loadingProjetos && projetosEditaveis.length > 0 && (
            <>
              <CargaModeloOpcionalSection
                modeloQueryScope="create"
                onAplicarModelo={aplicarModelo}
              />

              <CargaForm
                projetos={projetosEditaveis}
                initialData={formSeed}
                suggestedTag={proximoTagSugerido}
                onChange={setFormDraft}
                onSubmit={handleSubmit}
                loading={createMutation.isPending}
                lockProjeto
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
