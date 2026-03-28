import { useCallback, useEffect, useState } from 'react'
import { listarProjetos } from '../services/projetoService'
import type { Projeto } from '../types/projeto'

export function useProjetos() {
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const carregarProjetos = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data = await listarProjetos()
      setProjetos(data)
    } catch (err) {
      console.error('Erro ao carregar projetos:', err)
      setError('Não foi possível carregar os projetos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void carregarProjetos()
  }, [carregarProjetos])

  return {
    projetos,
    loading,
    error,
    recarregar: carregarProjetos,
  }
}