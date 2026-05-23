import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCargaListQuery } from '@/modules/configurador_paineis/cargas/hooks/useCargaListQuery'
import { useComposicaoSnapshotQuery } from '@/modules/configurador_paineis/composicao/hooks/useComposicaoSnapshotQuery'
import { useDimensionamentoQuery } from '@/modules/configurador_paineis/dimensionamento/hooks/useDimensionamentoQuery'
import { useProjetoDetailQuery } from '../hooks/useProjetoDetailQuery'
import { projetoQueryKeys } from '../projetoQueryKeys'
import { listarHistoricoProjeto } from '../services/projetoService'

export type WizardStepId = 'projeto' | 'cargas' | 'dimensionamento' | 'composicao'

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

export const ETAPAS_VALIDAS: WizardStepId[] = [
  'projeto',
  'cargas',
  'dimensionamento',
  'composicao',
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
  const condutoresRevisaoOk = Boolean(dimensionamento?.condutores_revisao_confirmada)
  const dimensionamentoEtapaConcluida = dimensionado && condutoresRevisaoOk
  const composicaoGerada = Boolean(
    composicao &&
      ((composicao.totais?.sugestoes ?? 0) > 0 ||
        (composicao.totais?.composicao_itens ?? 0) > 0 ||
        (composicao.totais?.pendencias ?? 0) > 0)
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
        status: statusDependente(!temCargas, condutoresRevisaoOk),
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
        key: 'rastreabilidade-usuario',
        label: 'Última ação executada por usuário identificado',
        status: statusHistorico(historico.length > 0, ultimaAcaoComUsuarioIdentificado),
      },
    ],
    [
      projeto,
      temCargas,
      dimensionado,
      condutoresRevisaoOk,
      dimensionamentoEtapaConcluida,
      dimensionamentoAposUltimaCarga,
      composicaoGerada,
      historico.length,
      ultimaAcaoComUsuarioIdentificado,
    ]
  )

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'projeto',
        title: 'Dados do projeto',
        description: 'Revise ou ajuste os dados de entrada do projeto.',
        href: `/projetos/${projetoId}/editar`,
        canEnter: true,
        done: Boolean(projeto),
      },
      {
        id: 'cargas',
        title: 'Cargas do projeto',
        description: 'Cadastre as cargas do projeto para liberar o dimensionamento de condutores.',
        href: `/cargas?projeto=${encodeURIComponent(projetoId)}`,
        canEnter: Boolean(projeto),
        done: temCargas,
      },
      {
        id: 'dimensionamento',
        title: 'Dimensionamento de condutores',
        description:
          'Revise bitolas sugeridas, ajuste se necessário (Iz mínimo) e confirme a revisão.',
        href: `/projetos/${projetoId}/fluxo/dimensionamento`,
        canEnter: temCargas,
        done: dimensionamentoEtapaConcluida,
      },
      {
        id: 'composicao',
        title: 'Composição do painel',
        description: 'Gere e aprove a composição para exportação final.',
        href: `/composicao?projeto=${encodeURIComponent(projetoId)}`,
        canEnter: dimensionamentoEtapaConcluida,
        done: composicaoGerada,
      },
    ],
    [projetoId, projeto, temCargas, dimensionamentoEtapaConcluida, composicaoGerada]
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
    prontoParaExportar,
    ultimaAcaoComUsuarioIdentificado,
    ultimoEvento,
    checklist,
    steps,
  }
}
