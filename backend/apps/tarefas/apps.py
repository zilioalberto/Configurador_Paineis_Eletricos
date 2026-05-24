from django.apps import AppConfig


class TarefasConfig(AppConfig):
    """App Django de tarefas operacionais (Kanban, apontamento e relatórios)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.tarefas"
    verbose_name = "Tarefas e Kanban"
