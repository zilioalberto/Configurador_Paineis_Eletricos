/**
 * Formulário completo do projeto, dividido em seções alinhadas ao backend.
 * Validação cliente espelha `Projeto.clean()`; erros da API são mapeados por campo.
 */

import type { ReactNode } from 'react'
import type { ProjetoFormData, ProjetoResponsavelOption } from '../../types/projeto'
import { ProjetoFormAlimentacaoSection } from './ProjetoFormAlimentacaoSection'
import { ProjetoFormDadosGeraisSection } from './ProjetoFormDadosGeraisSection'
import { ProjetoFormIdentificacaoSegurancaSection } from './ProjetoFormIdentificacaoSegurancaSection'
import { ProjetoFormRecursosSection } from './ProjetoFormRecursosSection'
import { ProjetoFormSeccionamentoSection } from './ProjetoFormSeccionamentoSection'
import { ROTULOS_CAMPOS_PROJETO } from './projetoFormValidation'
import { useProjetoForm } from './useProjetoForm'

type ProjetoFormProps = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  onSubmitError?: (error: unknown) => void
  loading?: boolean
  initialData?: ProjetoFormData
  responsavelOptions?: ProjetoResponsavelOption[]
  canEditResponsavel?: boolean
  showStatus?: boolean
  submitLabel?: string
  loadingLabel?: string
}

function ProjetoFormSection({
  title,
  accent,
  children,
}: {
  title: string
  accent: string
  children: ReactNode
}) {
  return (
    <section className="projeto-form-section">
      <div className="projeto-form-section__header">
        <span className="projeto-form-section__accent" aria-hidden style={{ backgroundColor: accent }} />
        <h2 className="h6 mb-0">{title}</h2>
      </div>
      <div className="row g-3">{children}</div>
    </section>
  )
}

export default function ProjetoForm({
  onSubmit,
  onSubmitError,
  loading = false,
  initialData,
  responsavelOptions = [],
  canEditResponsavel = false,
  showStatus = true,
  submitLabel = 'Salvar projeto',
  loadingLabel = 'Salvando...',
}: ProjetoFormProps) {
  const { formData, fieldErrors, handleFieldChange, handleSubmit } = useProjetoForm({
    onSubmit,
    onSubmitError,
    initialData,
  })

  const readOnlyExceptStatus = formData.status === 'FINALIZADO'
  /** Props compartilhadas entre todas as seções do formulário. */
  const sectionProps = {
    formData,
    onFieldChange: handleFieldChange,
    fieldErrors,
    readOnlyExceptStatus,
    responsavelOptions,
    canEditResponsavel,
    showStatus,
  }

  const fieldErrorEntries = Object.entries(fieldErrors)
  const bloqueado = readOnlyExceptStatus ? 'Projeto finalizado' : 'Em edição'

  return (
    <form className="projeto-form-workspace" onSubmit={handleSubmit} noValidate>
      <div className="projeto-form-actionbar">
        <div className="min-w-0">
          <p className="small text-muted mb-1">Configuração</p>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <strong className="text-truncate">{formData.codigo || 'Novo código'}</strong>
            <span className="badge text-bg-light border">{bloqueado}</span>
          </div>
        </div>
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? loadingLabel : submitLabel}
        </button>
      </div>

      {fieldErrorEntries.length > 0 ? (
        <div className="alert alert-danger" role="alert">
          <p className="mb-2 fw-semibold">Corrija os seguintes pontos antes de salvar:</p>
          <ul className="mb-0 ps-3">
            {fieldErrorEntries.map(([campo, mensagem]) => (
              <li key={campo}>
                <strong>{ROTULOS_CAMPOS_PROJETO[campo] ?? campo}:</strong> {mensagem}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ProjetoFormSection title="Dados gerais" accent="#2563eb">
        <ProjetoFormDadosGeraisSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Alimentação" accent="#059669">
        <ProjetoFormAlimentacaoSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Recursos do painel" accent="#7c3aed">
        <ProjetoFormRecursosSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Identificação e segurança" accent="#d97706">
        <ProjetoFormIdentificacaoSegurancaSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Seccionamento" accent="#0f766e">
        <ProjetoFormSeccionamentoSection {...sectionProps} />
      </ProjetoFormSection>
    </form>
  )
}
