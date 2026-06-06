from django.apps import AppConfig


class ConfiguracoesErpConfig(AppConfig):
    """App Django de parâmetros e regras globais do ERP."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.configuracoes_erp"
    verbose_name = "Configurações do ERP"
