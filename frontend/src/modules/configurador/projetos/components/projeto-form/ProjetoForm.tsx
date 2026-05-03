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
}

export default function ProjetoForm({
  onSubmit,
  onSubmitError,
  loading = false,
  initialData,
  responsavelOptions = [],
  canEditResponsavel = false,
  showStatus = true,
}: ProjetoFormProps) {
  const { formData, fieldErrors, handleFieldChange, handleSubmit } = useProjetoForm({
    onSubmit,
    onSubmitError,
    initialData,
  })

  const readOnlyExceptStatus = formData.status === 'FINALIZADO'
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

  return (
    <form onSubmit={handleSubmit} noValidate>
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
      <div className="row g-3">
        <ProjetoFormDadosGeraisSection {...sectionProps} />
        <ProjetoFormAlimentacaoSection {...sectionProps} />
        <ProjetoFormRecursosSection {...sectionProps} />
        <ProjetoFormIdentificacaoSegurancaSection {...sectionProps} />
        <ProjetoFormSeccionamentoSection {...sectionProps} />
      </div>

      <div className="mt-4 d-flex gap-2">
        <button type="submit" className="btn btn-success" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar projeto'}
        </button>
      </div>
    </form>
  )
}
