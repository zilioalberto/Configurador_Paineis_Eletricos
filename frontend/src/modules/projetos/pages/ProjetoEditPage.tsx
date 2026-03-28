import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProjetoForm from '../components/ProjetoForm'
import { obterProjeto, atualizarProjeto } from '../services/projetoService'
import type { Projeto, ProjetoFormData } from '../types/projeto'

function extrairMensagemErro(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = error.response.data

    if (typeof data === 'string') {
      return data
    }

    if (typeof data === 'object' && data !== null) {
      const mensagens = Object.entries(data)
        .map(([campo, valor]) => {
          if (Array.isArray(valor)) {
            return `${campo}: ${valor.join(', ')}`
          }

          if (typeof valor === 'string') {
            return `${campo}: ${valor}`
          }

          return `${campo}: erro de validação`
        })
        .join(' | ')

      if (mensagens) {
        return mensagens
      }
    }
  }

  return 'Não foi possível atualizar o projeto.'
}

function projetoParaFormData(projeto: Projeto): ProjetoFormData {
  return {
    codigo: projeto.codigo ?? '',
    nome: projeto.nome ?? '',
    descricao: projeto.descricao ?? '',
    cliente: projeto.cliente ?? '',

    status: projeto.status,
    tipo_painel: projeto.tipo_painel,

    tipo_corrente: projeto.tipo_corrente,
    tensao_nominal: projeto.tensao_nominal ?? '',
    numero_fases: projeto.numero_fases,
    frequencia: projeto.frequencia,

    possui_neutro: projeto.possui_neutro,
    possui_terra: projeto.possui_terra,

    tipo_conexao_alimentacao_potencia: projeto.tipo_conexao_alimentacao_potencia,
    tipo_conexao_alimentacao_neutro: projeto.tipo_conexao_alimentacao_neutro,
    tipo_conexao_alimentacao_terra: projeto.tipo_conexao_alimentacao_terra,

    tipo_corrente_comando: projeto.tipo_corrente_comando,
    tensao_comando: projeto.tensao_comando ?? '',

    possui_plc: projeto.possui_plc,
    possui_ihm: projeto.possui_ihm,
    possui_switches: projeto.possui_switches,
    possui_plaqueta_identificacao: projeto.possui_plaqueta_identificacao,
    possui_faixa_identificacao: projeto.possui_faixa_identificacao,
    possui_adesivo_alerta: projeto.possui_adesivo_alerta,
    possui_adesivos_tensao: projeto.possui_adesivos_tensao,

    possui_climatizacao: projeto.possui_climatizacao,
    tipo_climatizacao: projeto.tipo_climatizacao,

    fator_demanda: projeto.fator_demanda ?? '1.00',

    possui_seccionamento: projeto.possui_seccionamento,
    tipo_seccionamento: projeto.tipo_seccionamento,
  }
}

export default function ProjetoEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loadingProjeto, setLoadingProjeto] = useState(true)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [error, setError] = useState('')
  const [initialData, setInitialData] = useState<ProjetoFormData | null>(null)

  useEffect(() => {
    async function carregarProjeto() {
      if (!id) {
        setError('Projeto não informado.')
        setLoadingProjeto(false)
        return
      }

      try {
        setLoadingProjeto(true)
        setError('')

        const projeto = await obterProjeto(id)
        setInitialData(projetoParaFormData(projeto))
      } catch (err) {
        console.error('Erro ao carregar projeto para edição:', err)
        setError('Não foi possível carregar os dados do projeto.')
      } finally {
        setLoadingProjeto(false)
      }
    }

    void carregarProjeto()
  }, [id])

  async function handleSubmit(data: ProjetoFormData) {
    if (!id) return

    try {
      setLoadingSubmit(true)
      setError('')

      const projetoAtualizado = await atualizarProjeto(id, data)
      navigate(`/projetos/${projetoAtualizado.id}`)
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err)
      setError(extrairMensagemErro(err))
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Editar Projeto</h1>
        <p className="text-muted mb-0">
          Atualize os dados do projeto selecionado.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {loadingProjeto && <p className="mb-0">Carregando dados do projeto...</p>}

          {!loadingProjeto && error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {!loadingProjeto && !error && initialData && (
            <ProjetoForm
              onSubmit={handleSubmit}
              loading={loadingSubmit}
              initialData={initialData}
            />
          )}
        </div>
      </div>
    </div>
  )
}