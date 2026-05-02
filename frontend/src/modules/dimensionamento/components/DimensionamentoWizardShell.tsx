import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ProjetoIdentificacaoFluxo,
} from '@/modules/projetos/components/ProjetoIdentificacaoFluxo'
import { ProjetoFluxoStepper } from '@/modules/projetos/components/ProjetoFluxoStepper'
import { useAuth } from '@/modules/auth/AuthContext'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import { hasPermission } from '@/modules/auth/permissions'
import { useDimensionamentoQuery } from '../hooks/useDimensionamentoQuery'

type Props = {
  projetoId: string
  projetoCodigo?: string | null
  projetoNome?: string | null
  temCargas: boolean
  children: ReactNode
}

/**
 * Cabeçalho e cartão de projeto no estilo da página de Composição do painel,
 * para a etapa de dimensionamento no wizard.
 */
export function DimensionamentoWizardShell({
  projetoId,
  projetoCodigo,
  projetoNome,
  temCargas,
  children,
}: Props) {
  const { user } = useAuth()
  const canViewCargas = hasPermission(user, PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA)
  const canViewDimensionamento = hasPermission(user, PERMISSION_KEYS.PROJETO_VISUALIZAR)

  const { data: dim } = useDimensionamentoQuery(projetoId || null)
  const circuitos = dim?.circuitos_carga ?? []
  const nCirc = circuitos.length
  const nAprov = circuitos.filter((c) => Boolean(c.condutores_aprovado)).length
  const nPend = nCirc - nAprov
  const ag = dim?.alimentacao_geral
  const agOk = Boolean(ag?.condutores_aprovado)
  const revisaoOk = Boolean(dim?.condutores_revisao_confirmada)

  return (
    <div className="mb-4">
      <ProjetoFluxoStepper projetoId={projetoId} etapaAtual="dimensionamento" compact />

      <div className="mb-4">
        <h1 className="h3 mb-1">Dimensionamento de condutores</h1>
        <p className="text-muted mb-0">
          Revise as bitolas sugeridas para cada circuito e para a alimentação geral do painel,
          com base na corrente de projeto e na tabela B1 simplificada (Iz). Aprove linha a linha
          ou confirme tudo com <strong>Aprovar todas</strong> quando estiver consistente.
        </p>
      </div>

      <ProjetoIdentificacaoFluxo
        projetoCodigo={projetoCodigo}
        projetoNome={projetoNome}
        fallbackId={projetoId}
        footer={
          <p className="small text-muted mb-0">
            Antes de revisar as bitolas, confira as{' '}
            {canViewCargas ? (
              <Link to={`/cargas?projeto=${encodeURIComponent(projetoId)}`}>cargas</Link>
            ) : (
              'cargas'
            )}{' '}
            e o{' '}
            {canViewDimensionamento ? (
              <Link
                to={`/cargas?projeto=${encodeURIComponent(projetoId)}#dimensionamento-resumo`}
              >
                resumo de dimensionamento
              </Link>
            ) : (
              'resumo de dimensionamento'
            )}{' '}
            (corrente total de entrada).
          </p>
        }
      />

      {temCargas && dim ? (
        <div className="mb-3">
          <p className="small text-muted mb-0">
            Ib painel: {dim.corrente_total_painel_a ?? '—'} A
            {' · '}
            {nCirc} circuito(s)
            {' · '}
            {nAprov} aprovado(s)
            {' · '}
            {nPend} pendente(s)
            {ag ? (
              <>
                {' · '}
                Alimentação geral: {agOk ? 'aprovada' : 'pendente'}
              </>
            ) : null}
            {' · '}
            Revisão: {revisaoOk ? 'confirmada' : 'pendente'}
          </p>
        </div>
      ) : null}

      {children}
    </div>
  )
}
