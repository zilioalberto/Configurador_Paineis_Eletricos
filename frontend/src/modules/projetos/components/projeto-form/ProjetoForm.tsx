import type { ProjetoFormData, ProjetoResponsavelOption } from '../../types/projeto'
import { ProjetoFormAlimentacaoSection } from './ProjetoFormAlimentacaoSection'
import { ProjetoFormDadosGeraisSection } from './ProjetoFormDadosGeraisSection'
import { ProjetoFormIdentificacaoSegurancaSection } from './ProjetoFormIdentificacaoSegurancaSection'
import { ProjetoFormRecursosSection } from './ProjetoFormRecursosSection'
import { ProjetoFormSeccionamentoSection } from './ProjetoFormSeccionamentoSection'
import { useProjetoForm } from './useProjetoForm'

type ProjetoFormProps = {
  onSubmit: (data: ProjetoFormData) => Promise<void>
  loading?: boolean
  initialData?: ProjetoFormData
  responsavelOptions?: ProjetoResponsavelOption[]
  canEditResponsavel?: boolean
  showStatus?: boolean
}

export default function ProjetoForm({
  onSubmit,
  loading = false,
  initialData,
  responsavelOptions = [],
  canEditResponsavel = false,
  showStatus = true,
}: ProjetoFormProps) {
  const { formData, handleFieldChange, handleSubmit } = useProjetoForm({
    onSubmit,
    initialData,
  })

  const readOnlyExceptStatus = formData.status === 'FINALIZADO'
  const sectionProps = {
    formData,
    onFieldChange: handleFieldChange,
    readOnlyExceptStatus,
    responsavelOptions,
    canEditResponsavel,
    showStatus,
  }

  return (
    <form onSubmit={handleSubmit}>
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
