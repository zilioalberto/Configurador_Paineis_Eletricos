from django.contrib import admin

from .models import ResumoDimensionamento
from .services import calcular_e_salvar_dimensionamento_basico


@admin.register(ResumoDimensionamento)
class ResumoDimensionamentoAdmin(admin.ModelAdmin):
    list_display = (
        "projeto",
        "corrente_total_painel_a",
        "corrente_estimada_fonte_24vcc_a",
        "necessita_plc",
        "necessita_expansao_plc",
        "necessita_fonte_24vcc",
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

    search_fields = (
        "projeto__codigo",
        "projeto__nome",
        "projeto__cliente",
    )

    list_filter = (
        "necessita_plc",
        "necessita_expansao_plc",
        "necessita_fonte_24vcc",
    )

    readonly_fields = (
        "corrente_total_painel_a",
        "corrente_estimada_fonte_24vcc_a",
        "necessita_fonte_24vcc",
        "necessita_plc",
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

    actions = ["recalcular_dimensionamento_basico"]

    fieldsets = (
        (
            "Projeto",
            {
                "fields": ("projeto",),
            },
        ),
        (
            "Corrente",
            {
                "fields": (
                    "corrente_total_painel_a",
                    "corrente_estimada_fonte_24vcc_a",
                ),
            },
        ),
        (
            "Automação",
            {
                "fields": (
                    "necessita_fonte_24vcc",
                    "necessita_plc",
                    "necessita_expansao_plc",
                ),
            },
        ),
        (
            "Entradas e Saídas",
            {
                "fields": (
                    "total_entradas_digitais",
                    "total_saidas_digitais",
                    "total_entradas_analogicas",
                    "total_saidas_analogicas",
                ),
            },
        ),
        (
            "Dimensões do Painel",
            {
                "fields": (
                    "largura_painel_mm",
                    "altura_painel_mm",
                    "profundidade_painel_mm",
                ),
            },
        ),
        (
            "Ocupação e Montagem",
            {
                "fields": (
                    "taxa_ocupacao_percentual",
                    "horas_montagem",
                ),
            },
        ),
        (
            "Observações",
            {
                "fields": ("observacoes",),
            },
        ),
    )

    @admin.action(description="Recalcular dimensionamento básico")
    def recalcular_dimensionamento_basico(self, request, queryset):
        total = 0

        for resumo in queryset:
            calcular_e_salvar_dimensionamento_basico(resumo.projeto)
            total += 1

        self.message_user(
            request,
            f"{total} resumo(s) de dimensionamento recalculado(s) com sucesso.",
        )