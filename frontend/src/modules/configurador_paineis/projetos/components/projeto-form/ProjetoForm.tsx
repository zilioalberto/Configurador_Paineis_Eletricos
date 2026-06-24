/**
 * Formulário completo do projeto, dividido em seções alinhadas ao backend.
 * Validação cliente espelha `Projeto.clean()`; erros da API são mapeados por campo.
 */

import type { ReactNode } from 'react'
import type { ProjetoClienteOption, ProjetoFormData, ProjetoResponsavelOption } from '../../types/projeto'
import { ProjetoFormAlimentacaoSection } from './ProjetoFormAlimentacaoSection'
import { ProjetoFormDescricaoSection } from './ProjetoFormDescricaoSection'
import { ProjetoFormDadosGeraisSection } from './ProjetoFormDadosGeraisSection'
import { ProjetoFormIdentificacaoSegurancaSection } from './ProjetoFormIdentificacaoSegurancaSection'
import { ProjetoFormRecursosSection } from './ProjetoFormRecursosSection'
import { ProjetoFormSeccionamentoSection } from './ProjetoFormSeccionamentoSection'
import { ProjetoFormDisjuntorGeralSection } from './ProjetoFormDisjuntorGeralSection'
import { PROJETO_CONFIG_FORM_ID } from './projetoFormIds'
import { ROTULOS_CAMPOS_PROJETO } from './projetoFormValidation'
import { useProjetoForm } from './useProjetoForm'

type ProjetoFormProps = Readonly<{
  onSubmit: (data: ProjetoFormData) => Promise<void>
  onSubmitError?: (error: unknown) => void
  loading?: boolean
  initialData?: ProjetoFormData
  responsavelOptions?: ProjetoResponsavelOption[]
  clienteOptions?: ProjetoClienteOption[]
  carregandoClientes?: boolean
  canEditResponsavel?: boolean
  showStatus?: boolean
  submitLabel?: string
  loadingLabel?: string
  formId?: string
  /** Quando false, o botão Salvar fica só na barra azul (useAppPageToolbar). */
  showActionBar?: boolean
  /** Em `grid`, as seções usam duas colunas em telas largas (criação/edição compacta). */
  workspaceLayout?: 'stack' | 'grid'
}>

function ProjetoFormSection({
  title,
  accent,
  spanFull,
  children,
}: Readonly<{
  title: string
  accent: string
  spanFull?: boolean
  children: ReactNode
}>) {
  return (
    <section
      className={`projeto-form-section${spanFull ? ' projeto-form-section--span-full' : ''}`}
    >
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
  clienteOptions = [],
  carregandoClientes = false,
  canEditResponsavel = false,
  showStatus = true,
  submitLabel = 'Salvar projeto',
  loadingLabel = 'Salvando...',
  formId = PROJETO_CONFIG_FORM_ID,
  showActionBar = false,
  workspaceLayout = 'stack',
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
    clienteOptions,
    carregandoClientes,
    canEditResponsavel,
    showStatus,
  }

  const fieldErrorEntries = Object.entries(fieldErrors)
  const bloqueado = readOnlyExceptStatus ? 'Projeto finalizado' : 'Em edição'
  const secaoLarguraTotal = workspaceLayout === 'grid'

  return (
    <form
      id={formId}
      className={`projeto-form-workspace${
        workspaceLayout === 'grid' ? ' projeto-form-workspace--grid' : ''
      }`}
      onSubmit={handleSubmit}
      noValidate
    >
      {showActionBar ? (
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
      ) : null}

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

      <ProjetoFormSection title="Dados gerais" accent="#2563eb" spanFull={secaoLarguraTotal}>
        <ProjetoFormDadosGeraisSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Alimentação" accent="#059669" spanFull={secaoLarguraTotal}>
        <ProjetoFormAlimentacaoSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Recursos do painel" accent="#7c3aed" spanFull={secaoLarguraTotal}>
        <ProjetoFormRecursosSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection
        title="Identificação e segurança"
        accent="#d97706"
        spanFull={secaoLarguraTotal}
      >
        <ProjetoFormIdentificacaoSegurancaSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Seccionamento" accent="#0f766e" spanFull={secaoLarguraTotal}>
        <ProjetoFormSeccionamentoSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Disjuntor geral" accent="#0369a1" spanFull={secaoLarguraTotal}>
        <ProjetoFormDisjuntorGeralSection {...sectionProps} />
      </ProjetoFormSection>
      <ProjetoFormSection title="Descrição" accent="#64748b" spanFull>
        <ProjetoFormDescricaoSection {...sectionProps} />
      </ProjetoFormSection>
    </form>
  )
}
