/**
 * Estado e handlers do formulário de projeto: sincroniza campos condicionais
 * (CA/CC, neutro, PLC, seccionamento) e valida antes do submit.
 */

import { type SyntheticEvent, useCallback, useEffect, useState } from 'react'
import type { ProjetoFormData } from '../../types/projeto'
import { projetoFormInitialState } from './formOptions'
import type { ProjetoFormFieldChangeHandler } from './projetoFormSectionProps'
import { mapearErrosValidacaoApi, validarProjetoFormulario } from './projetoFormValidation'

type UseProjetoFormParams = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  /** Chamado quando o envio falha e não há erros de campo mapeáveis (rede, permissão, etc.). */
  onSubmitError?: (error: unknown) => void
  initialData?: ProjetoFormData
}

const numericFields = ['tensao_nominal', 'tensao_comando', 'numero_fases', 'frequencia']

function aplicarDependenciasCheckbox(
  data: ProjetoFormData,
  name: string,
  checked: boolean,
  anterior: ProjetoFormData
): ProjetoFormData {
  const updated = { ...data }
  if (name === 'possui_neutro' && !checked) updated.tipo_conexao_alimentacao_neutro = null
  if (name === 'possui_terra' && !checked) updated.tipo_conexao_alimentacao_terra = null
  if (name === 'possui_climatizacao' && !checked) updated.tipo_climatizacao = null
  if (name === 'possui_plc' && !checked) updated.familia_plc = null
  if (name === 'possui_seccionamento' && !checked) updated.tipo_seccionamento = null
  if (name === 'possui_seccionamento' && checked && anterior.tipo_seccionamento === 'NENHUM') {
    updated.tipo_seccionamento = null
  }
  if (name === 'possui_disjuntor_geral' && !checked) updated.tipo_disjuntor_geral = null
  return updated
}

function valorCampoProjeto(name: string, value: string) {
  if (name === 'responsavel') return value === '' ? null : Number(value)
  if (name === 'familia_plc') return value === '' ? null : value
  if (value === '') return ''
  return numericFields.includes(name) ? Number(value) : value
}

function aplicarDependenciasCampo(
  data: ProjetoFormData,
  name: string,
  value: string
): ProjetoFormData {
  if (name !== 'tipo_corrente') return data
  if (value === 'CC') {
    return {
      ...data,
      numero_fases: null,
      frequencia: null,
      possui_neutro: false,
      tipo_conexao_alimentacao_neutro: null,
    }
  }
  if (value === 'CA') {
    return {
      ...data,
      numero_fases: data.numero_fases ?? 3,
      frequencia: data.frequencia ?? 60,
    }
  }
  return data
}

export function useProjetoForm({ onSubmit, onSubmitError, initialData }: UseProjetoFormParams) {
  const [formData, setFormData] = useState<ProjetoFormData>(
    () => initialData ?? projetoFormInitialState
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      if (!(fieldName in prev)) return prev
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }, [])

  /** Atualiza código quando a sugestão da API chega após abrir "Novo projeto". */
  useEffect(() => {
    const c = initialData?.codigo
    if (c === undefined) return
    setFormData((prev) => (prev.codigo === c ? prev : { ...prev, codigo: c }))
  }, [initialData?.codigo])

  useEffect(() => {
    if (initialData?.responsavel == null) return
    setFormData((prev) =>
      prev.responsavel === initialData.responsavel
        ? prev
        : { ...prev, responsavel: initialData.responsavel }
    )
  }, [initialData?.responsavel])

  const handleFieldChange: ProjetoFormFieldChangeHandler = useCallback((event) => {
    const { name, value, type } = event.target
    clearFieldError(name)

    if (type === 'checkbox' && event.target instanceof HTMLInputElement) {
      const checked = event.target.checked

      setFormData((prev) => {
        return aplicarDependenciasCheckbox({ ...prev, [name]: checked }, name, checked, prev)
      })

      return
    }

    setFormData((prev) => {
      return aplicarDependenciasCampo({ ...prev, [name]: valorCampoProjeto(name, value) }, name, value)
    })
  }, [clearFieldError])

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
        familia_plc: formData.possui_plc ? formData.familia_plc : null,
        tipo_seccionamento: formData.possui_seccionamento
          ? formData.tipo_seccionamento
          : null,
        tipo_disjuntor_geral: formData.possui_disjuntor_geral
          ? formData.tipo_disjuntor_geral
          : null,
        responsavel: formData.responsavel || null,
      }

      const clientErrors = validarProjetoFormulario(payload)
      if (Object.keys(clientErrors).length > 0) {
        setFieldErrors(clientErrors)
        return
      }

      setFieldErrors({})

      try {
        await onSubmit(payload)
      } catch (err) {
        const serverErrors = mapearErrosValidacaoApi(err)
        if (Object.keys(serverErrors).length > 0) {
          setFieldErrors(serverErrors)
          return
        }
        onSubmitError?.(err)
      }
    },
    [formData, onSubmit, onSubmitError]
  )

  return { formData, fieldErrors, handleFieldChange, handleSubmit }
}
