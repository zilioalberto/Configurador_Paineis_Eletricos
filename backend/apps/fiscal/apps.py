from django.apps import AppConfig


class FiscalConfig(AppConfig):
    """App Django de tributação de referência (itens fiscais por produto)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.fiscal"
    verbose_name = "Fiscal"
