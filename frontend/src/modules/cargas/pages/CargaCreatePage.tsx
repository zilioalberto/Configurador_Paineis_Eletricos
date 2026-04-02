import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/feedback'
import { useProjetoListQuery } from '@/modules/projetos/hooks/useProjetoListQuery'
import { extrairMensagemErroApi } from '@/services/http/extrairMensagemErroApi'
import CargaForm from '../components/CargaForm'
import { useCreateCargaMutation } from '../hooks/useCargaMutations'
import type { CargaFormData } from '../types/carga'
import { cargaFormInitial } from '../utils/cargaFormDefaults'
import { cargaFormToApiPayload } from '../utils/cargaPayload'
import { filtrarProjetosComEdicaoCargas } from '../utils/projetoEdicaoCargas'

export default function CargaCreatePage() {
  const [searchParams] = useSearchParams()
  const projetoQuery = searchParams.get('projeto') ?? ''
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: projetos = [], isPending: loadingProjetos } = useProjetoListQuery()
  const projetosEditaveis = useMemo(
    () => filtrarProjetosComEdicaoCargas(projetos),
    [projetos]
  )

  const createMutation = useCreateCargaMutation()

  const initialData = useMemo(() => {
    const fromQuery =
      projetoQuery &&
      projetosEditaveis.some((p) => p.id === projetoQuery)
        ? projetoQuery
        : ''
    const pid = fromQuery || projetosEditaveis[0]?.id || ''
    return cargaFormInitial(pid)
  }, [projetoQuery, projetosEditaveis])

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
      navigate(`/cargas/${created.id}`)
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
          Informe o projeto e o tipo de carga. Os parâmetros específicos são preenchidos
          com valores padrão ao mudar o tipo (você pode ajustar antes de salvar).
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
              <Link to="/projetos/novo">Criar projeto</Link>
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
            <CargaForm
              projetos={projetosEditaveis}
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={createMutation.isPending}
              lockProjeto={false}
            />
          )}
        </div>
      </div>
    </div>
  )
}
