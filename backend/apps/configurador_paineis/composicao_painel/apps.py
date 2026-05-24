from django.apps import AppConfig


class ComposicaoPainelConfig(AppConfig):
    """App Django da etapa de composição (BoM) do configurador de painéis."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.configurador_paineis.composicao_painel'
    label = 'composicao_painel'
