from django.contrib import admin

from apps.tarefas.models import (
    ApontamentoHora,
    ChecklistTarefa,
    ColunaTarefa,
    ComentarioTarefa,
    HistoricoTarefa,
    QuadroTarefa,
    SessaoTrabalhoTarefa,
    Tarefa,
)


class ColunaTarefaInline(admin.TabularInline):
    model = ColunaTarefa
    extra = 0


@admin.register(QuadroTarefa)
class QuadroTarefaAdmin(admin.ModelAdmin):
    list_display = ("nome", "equipe", "ativo", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "equipe")
    inlines = [ColunaTarefaInline]


@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = (
        "titulo",
        "tipo_etapa",
        "coluna",
        "responsavel",
        "prioridade",
        "status",
        "prazo",
    )
    list_filter = ("tipo_etapa", "prioridade", "status", "coluna__quadro")
    search_fields = (
        "titulo",
        "descricao",
        "proposta_referencia",
        "ordem_producao_referencia",
    )
    autocomplete_fields = ("responsavel", "criador")


admin.site.register(ColunaTarefa)
admin.site.register(ComentarioTarefa)
admin.site.register(ChecklistTarefa)
admin.site.register(ApontamentoHora)
admin.site.register(HistoricoTarefa)
admin.site.register(SessaoTrabalhoTarefa)
