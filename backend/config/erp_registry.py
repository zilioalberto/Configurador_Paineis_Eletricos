"""
Metadados dos módulos do roadmap — usado pela API `GET .../erp/modules/<slug>/meta/`.
Chaves devem corresponder ao `id` do catálogo no frontend (hífen ou underscore resolvido na view).
"""

from __future__ import annotations

from typing import TypedDict


class ErpModuleMeta(TypedDict):
    id: str
    area: str
    title: str
    summary: str
    backend_package: str
    notes: str


AREA_POS_VENDA = "Pós-venda"


ERP_MODULES_REGISTRY: dict[str, ErpModuleMeta] = {
    "configurador-paineis": {
        "id": "configurador-paineis",
        "area": "Engenharia",
        "title": "Configurador de painéis",
        "summary": "Projetos, cargas, dimensionamento e composição técnica do painel.",
        "backend_package": "apps.configurador_paineis",
        "notes": "Sub-apps: projetos, cargas, dimensionamento, composicao_painel, wizard, selecao_componentes.",
    },
    "catalogo": {
        "id": "catalogo",
        "area": "Base compartilhada",
        "title": "Catálogo técnico",
        "summary": "Produtos, categorias, especificações técnicas e importação de XML de NF-e de fornecedores.",
        "backend_package": "apps.catalogo",
        "notes": "App `catalogo` — produtos, seletores e importação fiscal.",
    },
    "cadastros": {
        "id": "cadastros",
        "area": "Fundação",
        "title": "Cadastros",
        "summary": "Clientes, fornecedores, contatos, endereços e parceiros comerciais.",
        "backend_package": "apps.cadastros",
        "notes": "Fornecedor em produção; models e API a expandir: Pessoa, Contato, Endereco.",
    },
    "rh": {
        "id": "rh",
        "area": "Fundação",
        "title": "RH",
        "summary": "Colaboradores, cargos, departamentos, equipes e jornadas.",
        "backend_package": "apps.rh",
        "notes": "App stub — models e API a implementar.",
    },
    "crm": {
        "id": "crm",
        "area": "Comercial",
        "title": "CRM",
        "summary": "Leads, oportunidades, funil de vendas e follow-ups comerciais.",
        "backend_package": "apps.crm",
        "notes": "App stub — models e API a implementar.",
    },
    "orcamentos": {
        "id": "orcamentos",
        "area": "Comercial",
        "title": "Orçamentos",
        "summary": "Propostas, versões, itens, margens, impostos e condições comerciais.",
        "backend_package": "apps.orcamentos",
        "notes": "Modelos iniciais: Orcamento, OrcamentoItem — expandir versões e impostos.",
    },
    "pedidos-venda": {
        "id": "pedidos-venda",
        "area": "Comercial",
        "title": "Pedidos de venda",
        "summary": "Aceites, contratos e formalização do orçamento aprovado.",
        "backend_package": "apps.pedidos_venda",
        "notes": "App stub — integração com orçamentos e configuracoes_erp.",
    },
    "producao": {
        "id": "producao",
        "area": "Execução",
        "title": "Produção",
        "summary": "Ordens de produção, materiais previstos, realizado e desvios.",
        "backend_package": "apps.producao",
        "notes": "App stub — OPs e ligação com catálogo e estoque.",
    },
    "tarefas": {
        "id": "tarefas",
        "area": "Execução",
        "title": "Tarefas",
        "summary": "Kanban, responsáveis, prazos e apontamento de horas (app existente).",
        "backend_package": "apps.tarefas",
        "notes": "Implementação atual em `backend/apps/tarefas/`.",
    },
    "compras": {
        "id": "compras",
        "area": "Suprimentos",
        "title": "Compras",
        "summary": "Solicitações, cotações, pedidos de compra e recebimentos.",
        "backend_package": "apps.compras",
        "notes": "App stub — fluxo de aprovação e integração com estoque.",
    },
    "estoque": {
        "id": "estoque",
        "area": "Suprimentos",
        "title": "Estoque",
        "summary": "Saldos, reservas, entradas, saídas e rastreabilidade de materiais.",
        "backend_package": "apps.estoque",
        "notes": "App stub — movimentos e vínculo com produtos do catálogo.",
    },
    "fiscal": {
        "id": "fiscal",
        "area": "Suprimentos",
        "title": "Fiscal",
        "summary": "Itens fiscais por produto do catálogo e importação de tributos a partir da NF-e.",
        "backend_package": "apps.fiscal",
        "notes": "Modelo ItemFiscalProduto; integração com importação NF-e no catálogo.",
    },
    "financeiro": {
        "id": "financeiro",
        "area": "Controle",
        "title": "Financeiro",
        "summary": "Contas a pagar e receber, fluxo de caixa e resultado por projeto.",
        "backend_package": "apps.financeiro",
        "notes": "App stub — títulos, conciliação e centro de custo.",
    },
    "qualidade": {
        "id": "qualidade",
        "area": "Controle",
        "title": "Qualidade",
        "summary": "Checklists, inspeções, testes e não conformidades.",
        "backend_package": "apps.qualidade",
        "notes": "App stub — NCs e ações corretivas.",
    },
    "conformidade": {
        "id": "conformidade",
        "area": "Controle",
        "title": "Conformidade",
        "summary": "Documentos, treinamentos, exames e alertas de vencimento.",
        "backend_package": "apps.conformidade",
        "notes": "App stub — registros obrigatórios e notificações.",
    },
    "expedicao": {
        "id": "expedicao",
        "area": AREA_POS_VENDA,
        "title": "Expedição",
        "summary": "Remessas, volumes, transportadoras e comprovantes de entrega.",
        "backend_package": "apps.expedicao",
        "notes": "App stub — integração com pedidos de venda e estoque.",
    },
    "pos-venda": {
        "id": "pos-venda",
        "area": AREA_POS_VENDA,
        "title": "Pós-venda",
        "summary": "Chamados, garantia, assistência técnica e histórico de atendimento.",
        "backend_package": "apps.pos_venda",
        "notes": "App stub — tickets e SLAs.",
    },
    "documentos": {
        "id": "documentos",
        "area": "Transversal",
        "title": "Documentos",
        "summary": "Templates, PDFs gerados, anexos e documentos por entidade.",
        "backend_package": "apps.documentos",
        "notes": "App `documentos` — models e API a expandir.",
    },
    "notificacoes": {
        "id": "notificacoes",
        "area": "Transversal",
        "title": "Notificações",
        "summary": "Alertas internos, lembretes, avisos de vencimento e mensagens.",
        "backend_package": "apps.notificacoes",
        "notes": "App stub — fila e preferências por utilizador.",
    },
    "auditoria": {
        "id": "auditoria",
        "area": "Transversal",
        "title": "Auditoria",
        "summary": "Histórico técnico de alterações, aprovações e eventos relevantes.",
        "backend_package": "apps.auditoria",
        "notes": "App stub — event sourcing leve ou log append-only.",
    },
    "integracoes": {
        "id": "integracoes",
        "area": "Transversal",
        "title": "Integrações",
        "summary": "E-mail, WhatsApp, fiscal, bancos, APIs futuras e logs.",
        "backend_package": "apps.integracoes",
        "notes": "App stub — conectores e credenciais seguras.",
    },
    "relatorios": {
        "id": "relatorios",
        "area": "Indicadores",
        "title": "Relatórios",
        "summary": "Dashboards operacionais, comerciais, financeiros e gerenciais.",
        "backend_package": "apps.relatorios",
        "notes": "App stub — camada de leitura agregada; permissões por dataset.",
    },
    "configuracoes-erp": {
        "id": "configuracoes-erp",
        "area": "Administração",
        "title": "Configurações do ERP",
        "summary": "Parâmetros, numeração, impostos, calendários e regras gerais.",
        "backend_package": "apps.configuracoes_erp",
        "notes": "Modelo ParametroConfiguracao no app `apps.configuracoes_erp`.",
    },
}


def normalize_module_slug(raw: str) -> str:
    """Normaliza slug da URL (`_` → `-`, alias `configurador` → `configurador-paineis`)."""
    s = (raw or "").strip().lower().replace("_", "-")
    if s == "configurador":
        s = "configurador-paineis"
    if s in ERP_MODULES_REGISTRY:
        return s
    alt = s.replace("_", "-")
    if alt in ERP_MODULES_REGISTRY:
        return alt
    return s


def get_module_meta(slug: str) -> ErpModuleMeta | None:
    """Retorna metadados do módulo ou `None` se o slug não existir no registo."""
    key = normalize_module_slug(slug)
    return ERP_MODULES_REGISTRY.get(key)
