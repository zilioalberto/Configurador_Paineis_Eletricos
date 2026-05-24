from django.apps import AppConfig


class RhConfig(AppConfig):
    """App Django de recursos humanos (estrutura, jornadas e colaboradores)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.rh"
    verbose_name = "RH"
