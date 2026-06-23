/**
 * Rotas e menu do módulo fiscal (NF-e recebidas, itens fiscais, NSU).
 */
import { lazy, type ReactElement } from 'react'
import type { AppMenuItem, ModuleRouteConfig } from '@/app/navigation/types'
import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'
import RequirePermission from '@/modules/auth/RequirePermission'

const FiscalHomePage = lazy(() => import('./pages/FiscalHomePage'))
const ItensFiscaisListPage = lazy(() => import('./pages/ItensFiscaisListPage'))
const NfesRecebidasListPage = lazy(() => import('./pages/NfesRecebidasListPage'))
const SefazDistribuicaoPage = lazy(() => import('./pages/SefazDistribuicaoPage'))
const NfseRecebidasListPage = lazy(() => import('./pages/NfseRecebidasListPage'))
const NfseRecebidaDetailPage = lazy(() => import('./pages/NfseRecebidaDetailPage'))
const ObrigacoesFiscaisListPage = lazy(() => import('./pages/ObrigacoesFiscaisListPage'))
const ObrigacoesFiscaisCompetenciaPage = lazy(() => import('./pages/ObrigacoesFiscaisCompetenciaPage'))
const NfeRecebidaDetailPage = lazy(() => import('./pages/NfeRecebidaDetailPage'))
const NfeImportarCatalogoPage = lazy(() => import('./pages/NfeImportarCatalogoPage'))
const NfeImportarManualPage = lazy(() => import('./pages/NfeImportarManualPage'))
const NfeBuscarChavePage = lazy(() => import('./pages/NfeBuscarChavePage'))
const NfeEmitidaImportarPage = lazy(() => import('./pages/NfeEmitidaImportarPage'))
const NfeEmitidaDetailPage = lazy(() => import('./pages/NfeEmitidaDetailPage'))
const ControleNsuPage = lazy(() => import('./pages/ControleNsuPage'))
const RelatorioNfesPage = lazy(() => import('./pages/RelatorioNfesPage'))
const NfesEmitidasListPage = lazy(() => import('./pages/NfesEmitidasListPage'))
const ProjecaoDasSimplesPage = lazy(() => import('./pages/ProjecaoDasSimplesPage'))
const RelatorioFaturamentoPage = lazy(() => import('./pages/RelatorioFaturamentoPage'))

function withPermission(permission: string, element: ReactElement): ReactElement {
  return <RequirePermission permission={permission}>{element}</RequirePermission>
}

export const fiscalMenuItems: AppMenuItem[] = [
  {
    to: '/fiscal',
    label: 'Fiscal',
    order: 31,
    requiresPermission: PERMISSION_KEYS.FISCAL_VISUALIZAR,
  },
]

export const fiscalRoutes: ModuleRouteConfig[] = [
  {
    path: '/fiscal',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <FiscalHomePage />),
  },
  {
    path: '/fiscal/itens-fiscais',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <ItensFiscaisListPage />),
  },
  {
    path: '/fiscal/nfes',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfesRecebidasListPage />),
  },
  {
    path: '/fiscal/sefaz-distribuicao',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <SefazDistribuicaoPage />),
  },
  {
    path: '/fiscal/nfse-recebidas',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfseRecebidasListPage />),
  },
  {
    path: '/fiscal/nfse-recebidas/:id',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfseRecebidaDetailPage />),
  },
  {
    path: '/fiscal/obrigacoes',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <ObrigacoesFiscaisListPage />),
  },
  {
    path: '/fiscal/obrigacoes/:id',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <ObrigacoesFiscaisCompetenciaPage />),
  },
  {
    path: '/fiscal/relatorios/nfes',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <RelatorioNfesPage />),
  },
  {
    path: '/fiscal/relatorios/faturamento',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <RelatorioFaturamentoPage />),
  },
  {
    path: '/fiscal/nfes/importar',
    element: withPermission(PERMISSION_KEYS.FISCAL_EDITAR, <NfeImportarManualPage />),
  },
  {
    path: '/fiscal/nfes/buscar-chave',
    element: withPermission(PERMISSION_KEYS.FISCAL_EDITAR, <NfeBuscarChavePage />),
  },
  {
    path: '/fiscal/nfes-emitidas',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfesEmitidasListPage />),
  },
  {
    path: '/fiscal/nfes-emitidas/importar',
    element: withPermission(PERMISSION_KEYS.FISCAL_EDITAR, <NfeEmitidaImportarPage />),
  },
  {
    path: '/fiscal/nfes-emitidas/:id',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfeEmitidaDetailPage />),
  },
  {
    path: '/fiscal/simples/projecao-das',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <ProjecaoDasSimplesPage />),
  },
  {
    path: '/fiscal/nfes/:id/importar-catalogo',
    element: withPermission(PERMISSION_KEYS.FISCAL_EDITAR, <NfeImportarCatalogoPage />),
  },
  {
    path: '/fiscal/nfes/:id',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <NfeRecebidaDetailPage />),
  },
  {
    path: '/fiscal/nsu',
    element: withPermission(PERMISSION_KEYS.FISCAL_VISUALIZAR, <ControleNsuPage />),
  },
]
