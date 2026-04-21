import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from '../components/CargaForm'
import CargaModeloOpcionalSection from '../components/CargaModeloOpcionalSection'
import { useCargaDetailQuery } from '../hooks/useCargaDetailQuery'
import { useUpdateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData, CargaModelo } from '../types/carga'
import { applyTipoChange } from '../utils/cargaFormDefaults'
import { cargaDetailToForm } from '../utils/cargaDetailToForm'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { projetoPermiteEdicaoCargas } from '../utils/projetoEdicaoCargas'

export default function CargaEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const loadErrorToastSent = useRef(false)

  const {
    data: carga,
    isPending: loadingCarga,
    isError: isLoadError,
    error: loadQueryError,
    refetch,
  } = useCargaDetailQuery(id)

  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()

  const updateMutation = useUpdateCargaMutation()
  const [formSeed, setFormSeed] = useState<CargaFormData | null>(null)
  const [formDraft, setFormDraft] = useState<CargaFormData | null>(null)

  const initialData = useMemo(() => {
    if (!carga) return null
    return cargaDetailToForm(carga)
  }, [carga])

  useEffect(() => {
    if (!initialData) return
    setFormSeed(initialData)
    setFormDraft(initialData)
  }, [initialData])

  const projetoDaCarga = useMemo(
    () => (carga ? projetos.find((p) => p.id === carga.projeto) : undefined),
    [carga, projetos]
  )
  const edicaoBloqueada =
    carga != null && !projetoPermiteEdicaoCargas(projetoDaCarga)

  useEffect(() => {
    loadErrorToastSent.current = false
  }, [id])

  useEffect(() => {
    if (!isLoadError || !loadQueryError || loadErrorToastSent.current) return
    loadErrorToastSent.current = true
    showToast({
      variant: 'danger',
      title: 'Erro ao carregar carga',
      message:
        loadQueryError instanceof Error
          ? loadQueryError.message
          : 'Não foi possível carregar os dados.',
    })
  }, [isLoadError, loadQueryError, showToast])

  const aplicarModelo = useCallback(
    (modelo: CargaModelo) => {
      if (!formDraft) return
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
      setFormSeed({ ...next })
      setFormDraft(next)
      showToast({
        variant: 'success',
        message: `Modelo "${modelo.nome}" aplicado ao formulário.`,
      })
    },
    [formDraft, showToast]
  )

  async function handleSubmit(data: CargaFormData) {
    if (!id) return
    try {
      const updated = await updateMutation.mutateAsync({
        id,
        body: cargaFormToApiPayload(data),
      })
      showToast({ variant: 'success', message: 'Carga atualizada com sucesso.' })
      navigate(`/cargas?projeto=${encodeURIComponent(updated.projeto)}`)
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
        <h1 className="h3 mb-1">Editar carga</h1>
        <p className="text-muted mb-0">Altere os dados da carga selecionada.</p>
      </div>

      <div className="card">
        <div className="card-body">
          {!id && (
            <div className="alert alert-danger mb-0" role="alert">
              Carga não informada.
            </div>
          )}

          {id && (loadingCarga || loadingProjetos) && (
            <p className="text-muted mb-0">Carregando...</p>
          )}

          {id && !loadingCarga && isLoadError && (
            <div className="d-flex flex-wrap align-items-center gap-3">
              <p className="text-danger mb-0">Não foi possível carregar esta carga.</p>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => void refetch()}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {id &&
            !loadingCarga &&
            !isLoadError &&
            initialData &&
            projetos.length > 0 &&
            edicaoBloqueada && (
              <div className="alert alert-secondary mb-0" role="alert">
                Esta carga pertence a um projeto finalizado e não pode ser alterada
                por aqui.{' '}
                <Link to={`/cargas/${id}`}>Voltar aos detalhes</Link>
                {' · '}
                <Link to="/cargas">Lista de cargas</Link>
              </div>
            )}

          {id &&
            !loadingCarga &&
            !isLoadError &&
            formSeed &&
            projetos.length > 0 &&
            !edicaoBloqueada && (
              <>
                <CargaModeloOpcionalSection
                  key={`${id}-modelo`}
                  modeloQueryScope="edit"
                  onAplicarModelo={aplicarModelo}
                />

                <CargaForm
                  key={`${id}-form`}
                  projetos={projetos}
                  initialData={formSeed}
                  onChange={setFormDraft}
                  onSubmit={handleSubmit}
                  loading={updateMutation.isPending}
                  lockProjeto
                />
              </>
            )}
        </div>
      </div>
    </div>
  )
}
