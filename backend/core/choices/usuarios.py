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
    ALMOXARIFADO_VISUALIZAR_TAREFAS = (
        PermissionKeys.ALMOXARIFADO_VISUALIZAR_TAREFAS,
        "Ver tarefas de almoxarifado",
    )
    ALMOXARIFADO_SEPARAR_MATERIAL = (
        PermissionKeys.ALMOXARIFADO_SEPARAR_MATERIAL,
        "Separar materiais",
    )
    ALMOXARIFADO_BAIXAR_ESTOQUE = PermissionKeys.ALMOXARIFADO_BAIXAR_ESTOQUE, "Baixar estoque"
    RELATORIO_VISUALIZAR = PermissionKeys.RELATORIO_VISUALIZAR, "Ver relatórios"
    USUARIO_GERENCIAR = PermissionKeys.USUARIO_GERENCIAR, "Gerenciar utilizadores"
    PERFIL_GERENCIAR = PermissionKeys.PERFIL_GERENCIAR, "Gerenciar perfis e permissões"


def _build_default_permissions_map():
    all_permissions = {choice.value for choice in PermissaoUsuarioChoices}
    return {
        TipoUsuarioChoices.ADMIN: all_permissions,
        TipoUsuarioChoices.ENGENHARIA: {
            PermissaoUsuarioChoices.ORCAMENTO_VISUALIZAR.value,
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.ORCAMENTISTA: {
            PermissaoUsuarioChoices.ORCAMENTO_VISUALIZAR.value,
            PermissaoUsuarioChoices.ORCAMENTO_CRIAR.value,
            PermissaoUsuarioChoices.ORCAMENTO_EDITAR.value,
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.PROJETO_CRIAR.value,
            PermissaoUsuarioChoices.PROJETO_EDITAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.MATERIAL_EDITAR_LISTA.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.ALMOXARIFADO: {
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
            PermissaoUsuarioChoices.ALMOXARIFADO_VISUALIZAR_TAREFAS.value,
            PermissaoUsuarioChoices.ALMOXARIFADO_BAIXAR_ESTOQUE.value,
            PermissaoUsuarioChoices.RELATORIO_VISUALIZAR.value,
        },
        TipoUsuarioChoices.USUARIO: {
            PermissaoUsuarioChoices.PROJETO_VISUALIZAR.value,
            PermissaoUsuarioChoices.MATERIAL_VISUALIZAR_LISTA.value,
        },
    }


DEFAULT_PERMISSIONS_BY_TIPO = _build_default_permissions_map()
