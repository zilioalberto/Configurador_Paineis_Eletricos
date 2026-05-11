from django.db import models
from core.permissions import PermissionKeys


class TipoUsuarioChoices(models.TextChoices):
    """Perfis da aplicação — combinar com permissões de API e itens de menu no frontend."""

    ADMIN = "ADMIN", "Administrador"
    ENGENHARIA = "ENGENHARIA", "Engenharia"
    ORCAMENTISTA = "ORCAMENTISTA", "Orçamentista"
    ALMOXARIFADO = "ALMOXARIFADO", "Almoxarifado"
    USUARIO = "USUARIO", "Colaborador (geral)"


class PermissaoUsuarioChoices(models.TextChoices):
    """Permissões funcionais (RBAC + exceções por utilizador)."""

    ORCAMENTO_VISUALIZAR = PermissionKeys.ORCAMENTO_VISUALIZAR, "Ver orçamentos"
    ORCAMENTO_CRIAR = PermissionKeys.ORCAMENTO_CRIAR, "Criar orçamentos"
    ORCAMENTO_EDITAR = PermissionKeys.ORCAMENTO_EDITAR, "Editar orçamentos"
    ORCAMENTO_APROVAR = PermissionKeys.ORCAMENTO_APROVAR, "Aprovar orçamentos"
    PROJETO_VISUALIZAR = PermissionKeys.PROJETO_VISUALIZAR, "Ver projetos"
    PROJETO_CRIAR = PermissionKeys.PROJETO_CRIAR, "Criar projetos"
    PROJETO_EDITAR = PermissionKeys.PROJETO_EDITAR, "Editar projetos"
    PROJETO_EXCLUIR = PermissionKeys.PROJETO_EXCLUIR, "Excluir projetos"
    MATERIAL_VISUALIZAR_LISTA = (
        PermissionKeys.MATERIAL_VISUALIZAR_LISTA,
        "Ver lista de materiais",
    )
    MATERIAL_EDITAR_LISTA = PermissionKeys.MATERIAL_EDITAR_LISTA, "Editar lista de materiais"
    CADASTRO_VISUALIZAR = PermissionKeys.CADASTRO_VISUALIZAR, "Ver cadastros"
    CADASTRO_EDITAR = PermissionKeys.CADASTRO_EDITAR, "Editar cadastros"
    RH_VISUALIZAR = PermissionKeys.RH_VISUALIZAR, "Ver RH"
    RH_EDITAR = PermissionKeys.RH_EDITAR, "Editar RH"
    ALMOXARIFADO_VISUALIZAR_TAREFAS = (
        PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS,
        "Ver tarefas de almoxarifado",
    )
    ALMOXARIFADO_SEPARAR_MATERIAL = (
        PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL,
        "Separar materiais",
    )
    ALMOXARIFADO_BAIXAR_ESTOQUE = PermissionKeys.ALMOXARIFADO_BAIXAR_ESTOQUE, "Baixar estoque"
    TAREFA_VISUALIZAR = PermissionKeys.TAREFA_VISUALIZAR, "Ver tarefas"
    TAREFA_VISUALIZAR_PROPRIAS = (
        PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS,
        "Ver tarefas proprias",
    )
    TAREFA_VISUALIZAR_EQUIPE = (
        PermissionKeys.TAREFA_VISUALIZAR_EQUIPE,
        "Ver tarefas da equipe",
    )
    TAREFA_VISUALIZAR_TODAS = PermissionKeys.TAREFA_VISUALIZAR_TODAS, "Ver todas as tarefas"
    TAREFA_CRIAR = PermissionKeys.TAREFA_CRIAR, "Criar tarefas"
    TAREFA_EDITAR = PermissionKeys.TAREFA_EDITAR, "Editar tarefas"
    TAREFA_CLASSIFICAR = PermissionKeys.TAREFA_CLASSIFICAR, "Classificar tarefas"
    TAREFA_INICIAR = PermissionKeys.TAREFA_INICIAR, "Iniciar tarefas"
    TAREFA_CONCLUIR = PermissionKeys.TAREFA_CONCLUIR, "Concluir tarefas"
    TAREFA_EXCLUIR = PermissionKeys.TAREFA_EXCLUIR, "Excluir tarefas do Kanban"
    TAREFA_GERENCIAR_PARTICIPANTES = (
        PermissionKeys.TAREFA_GERENCIAR_PARTICIPANTES,
        "Gerenciar participantes de tarefas",
    )
    TAREFA_APONTAR_HORAS = PermissionKeys.TAREFA_APONTAR_HORAS, "Apontar horas em tarefas"
    TAREFA_APONTAR_HORAS_TODAS = (
        PermissionKeys.TAREFA_APONTAR_HORAS_TODAS,
        "Apontar horas para outros usuarios",
    )
    TAREFA_APROVAR_HORAS = PermissionKeys.TAREFA_APROVAR_HORAS, "Aprovar horas"
    TAREFA_AJUSTAR_HORAS = PermissionKeys.TAREFA_AJUSTAR_HORAS, "Ajustar horas"
    TAREFA_FECHAR_PERIODO_HORAS = (
        PermissionKeys.TAREFA_FECHAR_PERIODO_HORAS,
        "Fechar periodo de horas",
    )
    TAREFA_REABRIR_PERIODO_HORAS = (
        PermissionKeys.TAREFA_REABRIR_PERIODO_HORAS,
        "Reabrir periodo de horas",
    )
    TAREFA_VISUALIZAR_RELATORIOS = (
        PermissionKeys.TAREFA_VISUALIZAR_RELATORIOS,
        "Ver relatorios de tarefas",
    )
    TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS = (
        PermissionKeys.TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS,
        "Alterar classificacao com apontamentos",
    )
    TAREFA_GERENCIAR_QUADRO = (
        PermissionKeys.TAREFA_GERENCIAR_QUADRO,
        "Gerenciar quadros de tarefas",
    )
    CONFIGURACAO_ERP_GERENCIAR_JORNADA = (
        PermissionKeys.CONFIGURACAO_ERP_GERENCIAR_JORNADA,
        "Gerenciar jornada de trabalho",
    )
    CONFIGURACAO_ERP_VISUALIZAR = (
        PermissionKeys.CONFIGURACAO_ERP_VISUALIZAR,
        "Ver configuracoes do ERP",
    )
    CONFIGURACAO_ERP_GERENCIAR = (
        PermissionKeys.CONFIGURACAO_ERP_GERENCIAR,
        "Gerenciar configuracoes do ERP",
    )
    RELATORIO_VISUALIZAR = PermissionKeys.RELATORIO_VISUALIZAR, "Ver relatórios"
    USUARIO_GERENCIAR = PermissionKeys.USUARIO_GERENCIAR, "Gerenciar utilizadores"
    PERFIL_GERENCIAR = PermissionKeys.PERFIL_GERENCIAR, "Gerenciar perfis e permissões"


def _build_default_permissions_map():
    all_permissions = {choice.value for choice in PermissaoUsuarioChoices}
    tarefas_operacionais = {
        PermissaoUsuarioChoices.TAREFA_VISUALIZAR.value,
        PermissaoUsuarioChoices.TAREFA_VISUALIZAR_PROPRIAS.value,
        PermissaoUsuarioChoices.TAREFA_CRIAR.value,
        PermissaoUsuarioChoices.TAREFA_EDITAR.value,
        PermissaoUsuarioChoices.TAREFA_CLASSIFICAR.value,
        PermissaoUsuarioChoices.TAREFA_INICIAR.value,
        PermissaoUsuarioChoices.TAREFA_CONCLUIR.value,
        PermissaoUsuarioChoices.TAREFA_GERENCIAR_PARTICIPANTES.value,
        PermissaoUsuarioChoices.TAREFA_APONTAR_HORAS.value,
    }
    return {
        TipoUsuarioChoices.ADMIN: all_permissions,
        TipoUsuarioChoices.ENGENHARIA: {
            PermissaoUsuarioChoices.ORCAMENTO_VISUALIZAR.value,
            PermissaoUsuarioChoices.CONFIGURACAO_ERP_VISUALIZAR.value,
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            *tarefas_operacionais,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR_RELATORIOS.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.CADASTRO_VISUALIZAR.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.ORCAMENTISTA: {
            PermissaoUsuarioChoices.ORCAMENTO_VISUALIZAR.value,
            PermissaoUsuarioChoices.ORCAMENTO_CRIAR.value,
            PermissaoUsuarioChoices.ORCAMENTO_EDITAR.value,
            PermissaoUsuarioChoices.CONFIGURACAO_ERP_VISUALIZAR.value,
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.PROJETO_CRIAR.value,
            PermissaoUsuarioChoices.PROJETO_EDITAR.value,
            *tarefas_operacionais,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR_EQUIPE.value,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR_RELATORIOS.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.MATERIAL_EDITAR_LISTA.value,
            PermissaoUsuarioChoices.CADASTRO_VISUALIZAR.value,
            PermissaoUsuarioChoices.CADASTRO_EDITAR.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.ALMOXARIFADO: {
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.CADASTRO_VISUALIZAR.value,
            PermissaoUsuarioChoices.ALMOXARIFADO_VISUALIZAR_TAREFAS.value,
            PermissaoUsuarioChoices.ALMOXARIFADO_BAIXAR_ESTOQUE.value,
            *tarefas_operacionais,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR_RELATORIOS.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.USUARIO: {
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.CADASTRO_VISUALIZAR.value,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR.value,
            PermissaoUsuarioChoices.TAREFA_VISUALIZAR_PROPRIAS.value,
            PermissaoUsuarioChoices.TAREFA_INICIAR.value,
            PermissaoUsuarioChoices.TAREFA_APONTAR_HORAS.value,
        },
    }


DEFAULT_PERMISSIONS_BY_TIPO = _build_default_permissions_map()
