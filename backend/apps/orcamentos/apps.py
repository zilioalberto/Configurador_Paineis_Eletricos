from django.apps import AppConfig


class OrcamentosConfig(AppConfig):
    """App Django de propostas comerciais."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orcamentos"
    verbose_name = "Orçamentos comerciais"
