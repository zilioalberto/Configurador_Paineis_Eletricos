import { type SyntheticEvent, useCallback, useEffect, useState } from 'react'
import type { ProjetoFormData } from '../../types/projeto'
import { projetoFormInitialState } from './formOptions'
import type { ProjetoFormFieldChangeHandler } from './projetoFormSectionProps'

type UseProjetoFormParams = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  initialData?: ProjetoFormData
}

export function useProjetoForm({ onSubmit, initialData }: UseProjetoFormParams) {
  const [formData, setFormData] = useState<ProjetoFormData>(
    () => initialData ?? projetoFormInitialState
  )

  useEffect(() => {
    const c = initialData?.codigo
    if (c === undefined) return
    setFormData((prev) => (prev.codigo === c ? prev : { ...prev, codigo: c }))
  }, [initialData?.codigo])

  const handleFieldChange: ProjetoFormFieldChangeHandler = useCallback((event) => {
    const { name, value, type } = event.target

    if (type === 'checkbox' && event.target instanceof HTMLInputElement) {
      const checked = event.target.checked

      setFormData((prev) => {
        const updated = {
          ...prev,
          [name]: checked,
        }

        if (name === 'possui_neutro' && !checked) {
          updated.tipo_conexao_alimentacao_neutro = null
        }

        if (name === 'possui_terra' && !checked) {
          updated.tipo_conexao_alimentacao_terra = null
        }

        if (name === 'possui_climatizacao' && !checked) {
          updated.tipo_climatizacao = null
        }

        if (name === 'possui_seccionamento' && !checked) {
          updated.tipo_seccionamento = null
        }

        return updated
      })

      return
    }

    setFormData((prev) => {
      const updatedValue =
        value === ''
          ? ''
          : ['tensao_nominal', 'tensao_comando', 'numero_fases', 'frequencia'].includes(name)
            ? Number(value)
            : value

      const updated = {
        ...prev,
        [name]: updatedValue,
      }

      if (name === 'tipo_corrente' && value === 'CC') {
        updated.numero_fases = null
        updated.frequencia = null
        updated.possui_neutro = false
        updated.tipo_conexao_alimentacao_neutro = null
      }

      if (name === 'tipo_corrente' && value === 'CA') {
        updated.numero_fases ??= 3
        updated.frequencia ??= 60
      }

      return updated
    })
  }, [])

  const handleSubmit = useCallback(
    async (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()

      const payload: ProjetoFormData = {
        ...formData,
        numero_fases: formData.tipo_corrente === 'CC' ? null : formData.numero_fases,
        frequencia: formData.tipo_corrente === 'CC' ? null : formData.frequencia,
        tipo_conexao_alimentacao_neutro: formData.possui_neutro
          ? formData.tipo_conexao_alimentacao_neutro
          : null,
        tipo_conexao_alimentacao_terra: formData.possui_terra
          ? formData.tipo_conexao_alimentacao_terra
          : null,
        tipo_climatizacao: formData.possui_climatizacao
          ? formData.tipo_climatizacao
          : null,
        tipo_seccionamento: formData.possui_seccionamento
          ? formData.tipo_seccionamento
          : null,
      }

      await onSubmit(payload)
    },
    [formData, onSubmit]
  )

  return { formData, handleFieldChange, handleSubmit }
}
