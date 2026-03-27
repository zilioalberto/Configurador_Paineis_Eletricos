import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjetoForm from '../components/ProjetoForm'
import { criarProjeto } from '../services/projetoService'
import type { ProjetoFormData } from '../types/projeto'

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

  return 'Não foi possível criar o projeto.'
}

export default function ProjetoCreatePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(data: ProjetoFormData) {
    try {
      setLoading(true)
      setError('')

      const projeto = await criarProjeto(data)
      navigate(`/projetos/${projeto.id}`)
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      setError(extrairMensagemErro(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h1 className="h3 mb-1">Novo Projeto</h1>
        <p className="text-muted mb-0">
          Preencha os dados iniciais do projeto.
        </p>
      </div>

      <div className="card">
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <ProjetoForm onSubmit={handleSubmit} loading={loading} />
        </div>
      </div>
    </div>
  )
}