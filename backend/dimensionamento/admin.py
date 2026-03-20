from django.contrib import admin
from django.utils.html import format_html

from .models import ResumoDimensionamento
from .services import calcular_e_salvar_corrente_total_painel


@admin.register(ResumoDimensionamento)
class ResumoDimensionamentoAdmin(admin.ModelAdmin):
    list_display = (
        "projeto",
        "corrente_total_painel_a",
        "necessita_plc",
        "necessita_fonte_24vcc",
        "taxa_ocupacao_percentual",
        "horas_montagem",
        "botao_recalcular",
    )

    readonly_fields = (
        "corrente_total_painel_a",
        "necessita_plc",
        "necessita_fonte_24vcc",
        "necessita_expansao_plc",
        "total_entradas_digitais",
        "total_saidas_digitais",
        "total_entradas_analogicas",
        "total_saidas_analogicas",
        "largura_painel_mm",
        "altura_painel_mm",
        "profundidade_painel_mm",
        "taxa_ocupacao_percentual",
        "horas_montagem",
    )

    search_fields = ("projeto__codigo", "projeto__nome")
    list_filter = ("necessita_plc", "necessita_fonte_24vcc")

    actions = ["recalcular_corrente_total"]

    fieldsets = (
        ("Projeto", {
            "fields": ("projeto",)
        }),

        ("Corrente", {
            "fields": ("corrente_total_painel_a",)
        }),

        ("Automação", {
            "fields": (
                "necessita_plc",
                "necessita_expansao_plc",
                "necessita_fonte_24vcc",
            )
        }),

        ("Entradas / Saídas", {
            "fields": (
                "total_entradas_digitais",
                "total_saidas_digitais",
                "total_entradas_analogicas",
                "total_saidas_analogicas",
            )
        }),

        ("Dimensões do Painel", {
            "fields": (
                "largura_painel_mm",
                "altura_painel_mm",
                "profundidade_painel_mm",
            )
        }),

        ("Ocupação e Montagem", {
            "fields": (
                "taxa_ocupacao_percentual",
                "horas_montagem",
            )
        }),

        ("Observações", {
            "fields": ("observacoes",)
        }),
    )

    # Botão visual (coluna)
    def botao_recalcular(self, obj):
        return format_html(
            '<a class="button" href="/admin/dimensionamento/resumodimensionamento/{}/change/">Recalcular</a>',
            obj.id
        )

    botao_recalcular.short_description = "Ação"

    # Action para recalcular
    def recalcular_corrente_total(self, request, queryset):
        for resumo in queryset:
            calcular_e_salvar_corrente_total_painel(resumo.projeto)

        self.message_user(request, "Corrente total recalculada com sucesso.")

    recalcular_corrente_total.short_description = "Recalcular corrente total"