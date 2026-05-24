from django.apps import AppConfig


class CadastrosConfig(AppConfig):
    """App Django de cadastros comerciais (clientes, fornecedores e parceiros)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cadastros"
    verbose_name = "Cadastros (clientes, fornecedores, …)"
