/**
 * Estado agregado do wizard do projeto: etapas, checklist de conclusão
 * e indicadores de prontidão para exportação.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCargaListQuery } from '@/modules/configurador_paineis/cargas/hooks/useCargaListQuery'
import { useComposicaoSnapshotQuery } from '@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'
import { configuradorPaths } from '@/modules/configurador_paineis/configuradorPaths'
import { useProjetoDetailQuery } from '../hooks/useProjetoDetailQuery'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarHistoricoProjeto } from '../services/projetoService'

export type WizardStepId =
  | 'cargas'
  | 'dimensionamento'
  | 'composicao'
  | 'dimensionamento_mecanico'

export type WizardStep = {
  id: WizardStepId
  title: string
  description: string
  href: string
  canEnter: boolean
  done: boolean
}

export type ChecklistStatus = 'done' | 'pending' | 'blocked'

export type ChecklistItem = {
  key: string
  label: string
  status: ChecklistStatus
}

/** Etapas válidas na URL `/projetos/:id/fluxo/:etapa`. */
export const ETAPAS_VALIDAS: WizardStepId[] = [
  'cargas',
  'dimensionamento',
  'composicao',
  'dimensionamento_mecanico',
]

function statusDependente(
  bloqueado: boolean,
  concluido: boolean
): ChecklistStatus {
  if (bloqueado) return 'blocked'
  return concluido ? 'done' : 'pending'
}

function statusHistorico(
  possuiHistorico: boolean,
  usuarioIdentificado: boolean
): ChecklistStatus {
  if (!possuiHistorico) return 'pending'
  return usuarioIdentificado ? 'done' : 'pending'
}

export function useProjetoWizardFluxo(projetoId: string) {
  /** Consulta projeto, cargas, dimensionamento, composição e histórico em paralelo. */
  const { data: projeto, isPending: loadingProjeto } = useProjetoDetailQuery(
    projetoId || undefined
  )
  const { data: cargas = [], isPending: loadingCargas } = useCargaListQuery(projetoId || null)
  const { data: dimensionamento } = useDimensionamentoQuery(projetoId || null)
  const { data: composicao } = useComposicaoSnapshotQuery(projetoId || null)
  const { data: historico = [] } = useQuery({
    queryKey: projetoQueryKeys.historico(projetoId),
    queryFn: () => listarHistoricoProjeto(projetoId),
    enabled: Boolean(projetoId),
  })

  const temCargas = cargas.length > 0
  const dimensionado = Boolean(dimensionamento)
  const circuitos = dimensionamento?.circuitos_carga ?? []
  const ag = dimensionamento?.alimentacao_geral ?? null
  const todosCircuitosAprovados =
    circuitos.length > 0 && circuitos.every((c) => c.condutores_aprovado === true)
  const agAprovado = ag ? ag.condutores_aprovado === true : true

  // `condutores_revisao_confirmada` pode permanecer false quando o usuário aprova
  // linha a linha sem marcar explicitamente a "confirmação de revisão".
  // Para o fluxo do wizard, consideramos etapa concluída quando tudo está aprovado.
  const condutoresRevisaoEfetivamenteOk =
    Boolean(dimensionamento?.condutores_revisao_confirmada) ||
    (todosCircuitosAprovados && agAprovado)

  const dimensionamentoEtapaConcluida = dimensionado && condutoresRevisaoEfetivamenteOk
  const composicaoGerada = Boolean(
    composicao &&
      ((composicao.totais?.sugestoes ?? 0) > 0 ||
        (composicao.totais?.composicao_itens ?? 0) > 0 ||
        (composicao.totais?.pendencias ?? 0) > 0)
  )
  const composicaoComItens = (composicao?.totais?.composicao_itens ?? 0) > 0
  const dimensionamentoMecanicoCalculado = Boolean(
    dimensionamento?.detalhe_dimensionamento_mecanico?.area_componentes_mm2
  )

  const maxCargaAtualizacaoMs = useMemo(() => {
    if (!temCargas) return 0
    return cargas.reduce((max, carga) => {
      const ts = carga.atualizado_em ? new Date(carga.atualizado_em).getTime() : 0
      return Math.max(max, ts)
    }, 0)
  }, [cargas, temCargas])

  const dimensionamentoAtualizacaoMs = dimensionamento?.atualizado_em
    ? new Date(dimensionamento.atualizado_em).getTime()
    : 0

  const dimensionamentoAposUltimaCarga =
    temCargas && dimensionado && dimensionamentoAtualizacaoMs >= maxCargaAtualizacaoMs

  /** Fluxo técnico completo: cargas + condutores revisados + composição gerada. */
  const prontoParaExportar =
    temCargas && dimensionamentoEtapaConcluida && composicaoGerada

  const ultimoEvento = historico[0]
  const ultimaAcaoComUsuarioIdentificado = Boolean(
    ultimoEvento && (ultimoEvento.usuario_nome || ultimoEvento.usuario)
  )

  const checklist: ChecklistItem[] = useMemo(
    () => [
      {
        key: 'dados-projeto',
        label: 'Dados principais do projeto preenchidos',
        status: projeto ? 'done' : 'pending',
      },
      {
        key: 'cargas',
        label: 'Cargas cadastradas',
        status: temCargas ? 'done' : 'pending',
      },
      {
        key: 'dimensionamento',
        label: 'Dimensionamento calculado',
        status: statusDependente(!temCargas, dimensionado),
      },
      {
        key: 'condutores-confirmados',
        label: 'Bitolas de condutores confirmadas no wizard',
        status: statusDependente(!temCargas, condutoresRevisaoEfetivamenteOk),
      },
      {
        key: 'dimensionamento-recente',
        label: 'Dimensionamento atualizado após última alteração de cargas',
        status: statusDependente(!temCargas, dimensionamentoAposUltimaCarga),
      },
      {
        key: 'composicao',
        label: 'Composição gerada',
        status: statusDependente(!dimensionamentoEtapaConcluida, composicaoGerada),
      },
      {
        key: 'dimensionamento-mecanico',
        label: 'Dimensionamento mecânico calculado',
        status: statusDependente(!composicaoComItens, dimensionamentoMecanicoCalculado),
      },
      {
        key: 'rastreabilidade-usuario',
        label: 'Última ação executada por usuário identificado',
        status: statusHistorico(historico.length > 0, ultimaAcaoComUsuarioIdentificado),
      },
    ],
    [
      projeto,
      temCargas,
      dimensionado,
      condutoresRevisaoEfetivamenteOk,
      dimensionamentoEtapaConcluida,
      dimensionamentoAposUltimaCarga,
      composicaoGerada,
      composicaoComItens,
      dimensionamentoMecanicoCalculado,
      historico.length,
      ultimaAcaoComUsuarioIdentificado,
    ]
  )

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'cargas',
        title: 'Cargas do projeto',
        description: 'Cadastre as cargas do projeto para liberar o dimensionamento de condutores.',
        href: configuradorPaths.cargas(projetoId),
        canEnter: Boolean(projeto),
        done: temCargas,
      },
      {
        id: 'dimensionamento',
        title: 'Dimensionamento de condutores',
        description:
          'Revise bitolas sugeridas, ajuste se necessário (Iz mínimo) e confirme a revisão.',
        href: configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento'),
        canEnter: temCargas,
        done: dimensionamentoEtapaConcluida,
      },
      {
        id: 'composicao',
        title: 'Composição do painel',
        description: 'Gere e aprove a composição para exportação final.',
        href: configuradorPaths.composicao(projetoId),
        canEnter: dimensionamentoEtapaConcluida,
        done: composicaoComItens,
      },
      {
        id: 'dimensionamento_mecanico',
        title: 'Dimensionamento mecânico',
        description:
          'Calcule placa mínima, canaletas e o painel comercial mais próximo do catálogo.',
        href: configuradorPaths.configuracaoFluxo(projetoId, 'dimensionamento_mecanico'),
        canEnter: composicaoComItens,
        done: dimensionamentoMecanicoCalculado,
      },
    ],
    [
      projetoId,
      projeto,
      temCargas,
      dimensionamentoEtapaConcluida,
      composicaoComItens,
      dimensionamentoMecanicoCalculado,
    ]
  )

  return {
    projeto,
    loadingProjeto,
    loadingCargas,
    cargas,
    dimensionamento,
    composicao,
    historico,
    temCargas,
    dimensionamentoEtapaConcluida,
    composicaoGerada,
    composicaoComItens,
    dimensionamentoMecanicoCalculado,
    prontoParaExportar,
    ultimaAcaoComUsuarioIdentificado,
    ultimoEvento,
    checklist,
    steps,
  }
}
