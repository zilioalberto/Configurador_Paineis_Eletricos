import { useCallback, useEffect, useState } from 'react'
import type { SetURLSearchParams } from 'react-router-dom'

/**
 * Encapsula o estado e a sincronização de URL dos modais de nova carga e
 * edição de carga, mantendo a página de listagem mais simples.
 */
export function useCargaListModais(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  projetoIdListagem: string | null
) {
  const [novaCargaAberta, setNovaCargaAberta] = useState(() => searchParams.get('novo') === '1')
  const [cargaEmEdicaoId, setCargaEmEdicaoId] = useState<string | null>(
    () => searchParams.get('editar') || null
  )

  useEffect(() => {
    if (searchParams.get('novo') !== '1') return
    setNovaCargaAberta(true)
    setCargaEmEdicaoId(null)
    const params = new URLSearchParams(searchParams)
    params.delete('novo')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    const editar = searchParams.get('editar')
    if (!editar) return
    setCargaEmEdicaoId(editar)
    setNovaCargaAberta(false)
    const params = new URLSearchParams(searchParams)
    params.delete('editar')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  const abrirNovaCargaModal = useCallback(() => {
    if (!projetoIdListagem) return
    setCargaEmEdicaoId(null)
    setNovaCargaAberta(true)
  }, [projetoIdListagem])

  const fecharNovaCargaModal = useCallback(() => {
    setNovaCargaAberta(false)
  }, [])

  const abrirEditarCargaModal = useCallback(
    (cargaId: string) => {
      if (!projetoIdListagem) return
      setNovaCargaAberta(false)
      setCargaEmEdicaoId(cargaId)
    },
    [projetoIdListagem]
  )

  const fecharEditarCargaModal = useCallback(() => {
    setCargaEmEdicaoId(null)
  }, [])

  const temProjeto = Boolean(projetoIdListagem)
  return {
    cargaEmEdicaoId,
    novaCargaModalAberto: novaCargaAberta && temProjeto,
    editarCargaModalAberto: Boolean(cargaEmEdicaoId) && temProjeto,
    abrirNovaCargaModal,
    fecharNovaCargaModal,
    abrirEditarCargaModal,
    fecharEditarCargaModal,
  }
}
