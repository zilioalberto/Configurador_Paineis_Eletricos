from django.contrib import admin

from .models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from .services import calcular_e_salvar_dimensionamento_basico


@admin.register(DimensionamentoCircuitoAlimentacaoGeral)
class DimensionamentoCircuitoAlimentacaoGeralAdmin(admin.ModelAdmin):
    list_display = (
        "projeto",
        "corrente_total_painel_a",
        "tipo_corrente",
        "numero_fases",
        "possui_neutro",
        "possui_terra",
        "quantidade_condutores_fase",
        "secao_condutor_fase_mm2",
        "secao_condutor_pe_mm2",
    )
    list_filter = ("tipo_corrente", "possui_neutro", "possui_terra")
    search_fields = ("projeto__codigo", "projeto__nome")
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("projeto",)


@admin.register(DimensionamentoCircuitoCarga)
class DimensionamentoCircuitoCargaAdmin(admin.ModelAdmin):
    list_display = (
        "carga",
        "projeto",
        "tipo_carga",
        "classificacao_circuito",
        "corrente_projeto_a",
        "quantidade_condutores_fase",
        "possui_neutro",
        "possui_pe",
        "secao_condutor_fase_mm2",
        "secao_condutor_pe_mm2",
    )
    list_filter = ("tipo_carga", "classificacao_circuito", "possui_neutro", "possui_pe")
    search_fields = ("carga__tag", "projeto__codigo", "projeto__nome")
    ordering = ("projeto", "carga__tag")
    readonly_fields = (
        "criado_em",
        "atualizado_em",
    )

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "projeto",
                    "carga",
                    "tipo_carga",
                    "classificacao_circuito",
                )
            },
        ),
        (
            "Correntes",
            {
                "fields": (
                    "corrente_calculada_a",
                    "corrente_projeto_a",
                )
            },
        ),
        (
            "Condutores",
            {
                "fields": (
                    "quantidade_condutores_fase",
                    "quantidade_condutores_comando",
                    "quantidade_condutores_sinal",
                    "possui_neutro",
                    "possui_pe",
                    "secao_condutor_fase_mm2",
                    "secao_condutor_neutro_mm2",
                    "secao_condutor_pe_mm2",
                )
            },
        ),
        (
            "Texto",
            {
                "fields": ("observacoes", "memoria_calculo"),
            },
        ),
        (
            "Datas",
            {"fields": ("criado_em", "atualizado_em")},
        ),
    )


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