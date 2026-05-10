import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

export type ErpModuleStatus = 'available' | 'planned'

export type ErpModule = {
  id: string
  /** Pacote Python importável (ex.: `apps.catalogo`; espelha `erp_registry`). */
  backendPackage: string
  title: string
  area: string
  summary: string
  status: ErpModuleStatus
  /** Rota de pré-visualização da estrutura (shell) ou módulo já operacional. */
  to?: string
  permissions?: string[]
}

export const ERP_MODULES: ErpModule[] = [
  {
    id: 'configurador_paineis',
    backendPackage: 'apps.configurador_paineis',
    title: 'Configurador de painéis',
    area: 'Engenharia',
    summary: 'Projetos, cargas, dimensionamento e composição técnica do painel.',
    status: 'available',
    to: '/dashboard',
    permissions: [
      PERMISSION_KEYS.PROJETO_VISUALIZAR,
      PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA,
      PERMISSION_KEYS.ALMOXARIFADO_VISUALIZAR_TAREFAS,
    ],
  },
  {
    id: 'catalogo',
    backendPackage: 'apps.catalogo',
    title: 'Catálogo técnico',
    area: 'Base compartilhada',
    summary:
      'Produtos, categorias, especificações técnicas e importação de XML de NF-e de fornecedores.',
    status: 'available',
    to: '/catalogo',
    permissions: [PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA],
  },
  {
    id: 'cadastros',
    backendPackage: 'apps.cadastros',
    title: 'Cadastros',
    area: 'Fundação',
    summary: 'Clientes, fornecedores, contatos, endereços e parceiros comerciais.',
    status: 'planned',
    to: '/erp/m/cadastros',
  },
  {
    id: 'rh',
    backendPackage: 'apps.rh',
    title: 'RH',
    area: 'Fundação',
    summary: 'Colaboradores, cargos, departamentos, equipes e jornadas.',
    status: 'planned',
    to: '/erp/m/rh',
  },
  {
    id: 'crm',
    backendPackage: 'apps.crm',
    title: 'CRM',
    area: 'Comercial',
    summary: 'Leads, oportunidades, funil de vendas e follow-ups comerciais.',
    status: 'planned',
    to: '/erp/m/crm',
  },
  {
    id: 'orcamentos',
    backendPackage: 'apps.orcamentos',
    title: 'Orçamentos',
    area: 'Comercial',
    summary: 'Propostas, versões, itens, margens, impostos e condições comerciais.',
    status: 'available',
    to: '/erp/orcamentos',
    permissions: [PERMISSION_KEYS.ORCAMENTO_VISUALIZAR],
  },
  {
    id: 'pedidos-venda',
    backendPackage: 'apps.pedidos_venda',
    title: 'Pedidos de venda',
    area: 'Comercial',
    summary: 'Aceites, contratos e formalização do orçamento aprovado.',
    status: 'planned',
    to: '/erp/m/pedidos-venda',
  },
  {
    id: 'producao',
    backendPackage: 'apps.producao',
    title: 'Produção',
    area: 'Execução',
    summary: 'Ordens de produção, materiais previstos, realizado e desvios.',
    status: 'planned',
    to: '/erp/m/producao',
  },
  {
    id: 'tarefas',
    backendPackage: 'apps.tarefas',
    title: 'Tarefas',
    area: 'Execução',
    summary: 'Kanban, responsáveis, prazos, comentários e apontamento de horas.',
    status: 'available',
    to: '/tarefas',
    permissions: [PERMISSION_KEYS.TAREFA_VISUALIZAR],
  },
  {
    id: 'compras',
    backendPackage: 'apps.compras',
    title: 'Compras',
    area: 'Suprimentos',
    summary: 'Solicitações, cotações, pedidos de compra e recebimentos.',
    status: 'planned',
    to: '/erp/m/compras',
  },
  {
    id: 'estoque',
    backendPackage: 'apps.estoque',
    title: 'Estoque',
    area: 'Suprimentos',
    summary: 'Saldos, reservas, entradas, saídas e rastreabilidade de materiais.',
    status: 'planned',
    to: '/erp/m/estoque',
  },
  {
    id: 'fiscal',
    backendPackage: 'apps.fiscal',
    title: 'Fiscal',
    area: 'Suprimentos',
    summary: 'Importação de NF-e, itens fiscais e vínculo com o catálogo.',
    status: 'available',
    to: '/fiscal',
    permissions: [PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA],
  },
  {
    id: 'financeiro',
    backendPackage: 'apps.financeiro',
    title: 'Financeiro',
    area: 'Controle',
    summary: 'Contas a pagar e receber, fluxo de caixa e resultado por projeto.',
    status: 'planned',
    to: '/erp/m/financeiro',
  },
  {
    id: 'qualidade',
    backendPackage: 'apps.qualidade',
    title: 'Qualidade',
    area: 'Controle',
    summary: 'Checklists, inspeções, testes e não conformidades.',
    status: 'planned',
    to: '/erp/m/qualidade',
  },
  {
    id: 'conformidade',
    backendPackage: 'apps.conformidade',
    title: 'Conformidade',
    area: 'Controle',
    summary: 'Documentos, treinamentos, exames e alertas de vencimento.',
    status: 'planned',
    to: '/erp/m/conformidade',
  },
  {
    id: 'expedicao',
    backendPackage: 'apps.expedicao',
    title: 'Expedição',
    area: 'Pós-venda',
    summary: 'Remessas, volumes, transportadoras e comprovantes de entrega.',
    status: 'planned',
    to: '/erp/m/expedicao',
  },
  {
    id: 'pos-venda',
    backendPackage: 'apps.pos_venda',
    title: 'Pós-venda',
    area: 'Pós-venda',
    summary: 'Chamados, garantia, assistência técnica e histórico de atendimento.',
    status: 'planned',
    to: '/erp/m/pos-venda',
  },
  {
    id: 'documentos',
    backendPackage: 'apps.documentos',
    title: 'Documentos',
    area: 'Transversal',
    summary: 'Templates, PDFs gerados, anexos e documentos por entidade.',
    status: 'planned',
    to: '/erp/m/documentos',
  },
  {
    id: 'notificacoes',
    backendPackage: 'apps.notificacoes',
    title: 'Notificações',
    area: 'Transversal',
    summary: 'Alertas internos, lembretes, avisos de vencimento e mensagens.',
    status: 'planned',
    to: '/erp/m/notificacoes',
  },
  {
    id: 'auditoria',
    backendPackage: 'apps.auditoria',
    title: 'Auditoria',
    area: 'Transversal',
    summary: 'Histórico técnico de alterações, aprovações e eventos relevantes.',
    status: 'planned',
    to: '/erp/m/auditoria',
  },
  {
    id: 'integracoes',
    backendPackage: 'apps.integracoes',
    title: 'Integrações',
    area: 'Transversal',
    summary: 'E-mail, WhatsApp, fiscal, bancos, APIs futuras e logs.',
    status: 'planned',
    to: '/erp/m/integracoes',
  },
  {
    id: 'relatorios',
    backendPackage: 'apps.relatorios',
    title: 'Relatórios',
    area: 'Indicadores',
    summary: 'Dashboards operacionais, comerciais, financeiros e gerenciais.',
    status: 'planned',
    to: '/erp/m/relatorios',
  },
  {
    id: 'configuracoes-erp',
    backendPackage: 'apps.configuracoes_erp',
    title: 'Configurações do ERP',
    area: 'Administração',
    summary: 'Parâmetros, numeração, impostos, calendários e regras gerais.',
    status: 'available',
    to: '/erp/configuracoes',
    permissions: [PERMISSION_KEYS.CONFIGURACAO_ERP_VISUALIZAR],
  },
]

/** Slug da rota `/erp/m/:slug` (mesmo formato do `id` do catálogo). */
export function findErpModuleByShellSlug(slug: string): ErpModule | undefined {
  const s = slug.trim().toLowerCase()
  return ERP_MODULES.find((m) => m.id === s)
}
