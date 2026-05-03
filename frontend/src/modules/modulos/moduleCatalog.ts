import { PERMISSION_KEYS } from '@/modules/auth/permissionKeys'

export type ErpModuleStatus = 'available' | 'planned'

export type ErpModule = {
  id: string
  title: string
  area: string
  summary: string
  status: ErpModuleStatus
  to?: string
  permissions?: string[]
}

export const ERP_MODULES: ErpModule[] = [
  {
    id: 'configurador',
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
    title: 'Catálogo técnico',
    area: 'Base compartilhada',
    summary: 'Produtos, categorias e especificações técnicas usadas pelo ERP.',
    status: 'available',
    to: '/catalogo',
    permissions: [PERMISSION_KEYS.MATERIAL_VISUALIZAR_LISTA],
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    area: 'Fundação',
    summary: 'Clientes, fornecedores, contatos, endereços e parceiros comerciais.',
    status: 'planned',
  },
  {
    id: 'rh',
    title: 'RH',
    area: 'Fundação',
    summary: 'Colaboradores, cargos, departamentos, equipes e jornadas.',
    status: 'planned',
  },
  {
    id: 'crm',
    title: 'CRM',
    area: 'Comercial',
    summary: 'Leads, oportunidades, funil de vendas e follow-ups comerciais.',
    status: 'planned',
  },
  {
    id: 'orcamentos',
    title: 'Orçamentos',
    area: 'Comercial',
    summary: 'Propostas, versões, itens, margens, impostos e condições comerciais.',
    status: 'planned',
  },
  {
    id: 'pedidos-venda',
    title: 'Pedidos de venda',
    area: 'Comercial',
    summary: 'Aceites, contratos e formalização do orçamento aprovado.',
    status: 'planned',
  },
  {
    id: 'producao',
    title: 'Produção',
    area: 'Execução',
    summary: 'Ordens de produção, materiais previstos, realizado e desvios.',
    status: 'planned',
  },
  {
    id: 'tarefas',
    title: 'Tarefas',
    area: 'Execução',
    summary: 'Kanban, responsáveis, prazos, comentários e apontamento de horas.',
    status: 'planned',
  },
  {
    id: 'compras',
    title: 'Compras',
    area: 'Suprimentos',
    summary: 'Solicitações, cotações, pedidos de compra e recebimentos.',
    status: 'planned',
  },
  {
    id: 'estoque',
    title: 'Estoque',
    area: 'Suprimentos',
    summary: 'Saldos, reservas, entradas, saídas e rastreabilidade de materiais.',
    status: 'planned',
  },
  {
    id: 'fiscal',
    title: 'Fiscal',
    area: 'Suprimentos',
    summary: 'Importação de NF-e, itens fiscais e vínculo com o catálogo.',
    status: 'planned',
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    area: 'Controle',
    summary: 'Contas a pagar e receber, fluxo de caixa e resultado por projeto.',
    status: 'planned',
  },
  {
    id: 'qualidade',
    title: 'Qualidade',
    area: 'Controle',
    summary: 'Checklists, inspeções, testes e não conformidades.',
    status: 'planned',
  },
  {
    id: 'conformidade',
    title: 'Conformidade',
    area: 'Controle',
    summary: 'Documentos, treinamentos, exames e alertas de vencimento.',
    status: 'planned',
  },
  {
    id: 'expedicao',
    title: 'Expedição',
    area: 'Pós-venda',
    summary: 'Remessas, volumes, transportadoras e comprovantes de entrega.',
    status: 'planned',
  },
  {
    id: 'pos-venda',
    title: 'Pós-venda',
    area: 'Pós-venda',
    summary: 'Chamados, garantia, assistência técnica e histórico de atendimento.',
    status: 'planned',
  },
  {
    id: 'documentos',
    title: 'Documentos',
    area: 'Transversal',
    summary: 'Templates, PDFs gerados, anexos e documentos por entidade.',
    status: 'planned',
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    area: 'Transversal',
    summary: 'Alertas internos, lembretes, avisos de vencimento e mensagens.',
    status: 'planned',
  },
  {
    id: 'auditoria',
    title: 'Auditoria',
    area: 'Transversal',
    summary: 'Histórico técnico de alterações, aprovações e eventos relevantes.',
    status: 'planned',
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    area: 'Transversal',
    summary: 'E-mail, WhatsApp, fiscal, bancos, APIs futuras e logs.',
    status: 'planned',
  },
  {
    id: 'relatorios',
    title: 'Relatórios',
    area: 'Indicadores',
    summary: 'Dashboards operacionais, comerciais, financeiros e gerenciais.',
    status: 'planned',
  },
  {
    id: 'configuracoes-erp',
    title: 'Configurações do ERP',
    area: 'Administração',
    summary: 'Parâmetros, numeração, impostos, calendários e regras gerais.',
    status: 'planned',
  },
]
