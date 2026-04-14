from django.db import models


class TipoUsuarioChoices(models.TextChoices):
    """Perfis da aplicação — combinar com permissões de API e itens de menu no frontend."""

    ADMIN = "ADMIN", "Administrador"
    ENGENHARIA = "ENGENHARIA", "Engenharia"
    ORCAMENTISTA = "ORCAMENTISTA", "Orçamentista"
    ALMOXARIFADO = "ALMOXARIFADO", "Almoxarifado"
    USUARIO = "USUARIO", "Colaborador (geral)"
