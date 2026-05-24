"""App Django de contas e utilizadores customizados."""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """Configuração do app `apps.accounts`."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'
