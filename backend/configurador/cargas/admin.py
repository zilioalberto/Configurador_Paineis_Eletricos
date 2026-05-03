from django.contrib import admin

from core.choices import TipoCargaChoices

from .models import (
    Carga,
    CargaMotor,
    CargaValvula,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
)


class CargaMotorInline(admin.StackedInline):
    model = CargaMotor
    extra = 0
    max_num = 1
    can_delete = True
    readonly_fields = ("potencia_kw_calculada", "corrente_calculada_a")

    fieldsets = (
        ("Dados do Motor", {
            "fields": (
                "potencia_corrente_valor",
                "potencia_corrente_unidade",
                "numero_fases",
                "tensao_motor",
                "rendimento_percentual",
                "fator_potencia",
                "tipo_partida",
                "tipo_protecao",
                "reversivel",
                "freio_motor",
            )
        }),
        ("Cálculos", {
            "fields": (
                "potencia_kw_calculada",
                "corrente_calculada_a",
            )
        }),
    )


class CargaValvulaInline(admin.StackedInline):
    model = CargaValvula
    extra = 0
    max_num = 1
    can_delete = True

    fieldsets = (
        ("Dados da Válvula", {
            "fields": (
                "tipo_valvula",
                "quantidade_vias",
                "quantidade_posicoes",
                "quantidade_solenoides",
                "retorno_mola",
                "possui_feedback",
            )
        }),
        ("Dados Elétricos", {
            "fields": (
                "tensao_alimentacao",
                "tipo_corrente",
                "corrente_consumida_ma",
                "tipo_protecao",
                "tipo_acionamento",
                "tipo_rele_interface",
            )
        }),
    )


class CargaResistenciaInline(admin.StackedInline):
    model = CargaResistencia
    extra = 0
    max_num = 1
    can_delete = True
    readonly_fields = ("corrente_calculada_a",)

    fieldsets = (
        ("Dados da Resistência", {
            "fields": (
                "numero_fases",
                "tensao_resistencia",
                "tipo_protecao",
                "tipo_acionamento",
                "tipo_rele_interface",
                "tipo_conexao_painel",
                "potencia_kw",
            )
        }),
        ("Cálculo", {
            "fields": (
                "corrente_calculada_a",
            )
        }),
    )


class CargaSensorInline(admin.StackedInline):
    model = CargaSensor
    extra = 0
    max_num = 1
    can_delete = True

    fieldsets = (
        ("Dados do Sensor", {
            "fields": (
                "tipo_sensor",
                "tipo_sinal",
                "tipo_sinal_analogico",
                "tensao_alimentacao",
                "tipo_corrente",
                "corrente_consumida_ma",
                "quantidade_fios",
            )
        }),
        ("Características", {
            "fields": (
                "pnp",
                "npn",
                "normalmente_aberto",
                "normalmente_fechado",
            )
        }),
    )


class CargaTransdutorInline(admin.StackedInline):
    model = CargaTransdutor
    extra = 0
    max_num = 1
    can_delete = True

    fieldsets = (
        ("Dados do Transdutor", {
            "fields": (
                "tipo_transdutor",
                "faixa_medicao",
                "tipo_sinal_analogico",
                "tensao_alimentacao",
                "tipo_corrente",
                "corrente_consumida_ma",
                "quantidade_fios",
            )
        }),
    )


@admin.register(Carga)
class CargaAdmin(admin.ModelAdmin):
    list_display = (
        "tag",
        "descricao",
        "tipo",
        "projeto",
        "quantidade",
        "ativo",
    )

    search_fields = (
        "tag",
        "descricao",
        "projeto__codigo",
        "projeto__nome",
    )

    list_filter = (
        "tipo",
        "projeto",
        "ativo",
    )

    ordering = ("projeto", "tag")

    readonly_fields = (
        "quantidade_entradas_digitais",
        "quantidade_entradas_analogicas",
        "quantidade_saidas_digitais",
        "quantidade_saidas_analogicas",
        "quantidade_entradas_rapidas",
    )

    fieldsets = (
        ("Informações Gerais", {
            "fields": (
                "projeto",
                "tag",
                "descricao",
                "tipo",
                "quantidade",
            )
        }),
        ("Aplicação", {
            "fields": (
                "local_instalacao",
                "observacoes",
            )
        }),
        ("Requisitos", {
            "fields": (
                "exige_protecao",
                "exige_seccionamento",
                "exige_comando",
            )
        }),
        ("Dimensionamento de IO", {
            "fields": (
                "quantidade_entradas_digitais",
                "quantidade_entradas_analogicas",
                "quantidade_saidas_digitais",
                "quantidade_saidas_analogicas",
                "quantidade_entradas_rapidas",
            )
        }),
        ("Status", {
            "fields": (
                "ativo",
            )
        }),
    )

    def get_inlines(self, request, obj=None):
        if obj is None:
            return []

        if obj.tipo == TipoCargaChoices.MOTOR:
            return [CargaMotorInline]

        if obj.tipo == TipoCargaChoices.VALVULA:
            return [CargaValvulaInline]

        if obj.tipo == TipoCargaChoices.RESISTENCIA:
            return [CargaResistenciaInline]

        if obj.tipo == TipoCargaChoices.SENSOR:
            return [CargaSensorInline]

        if obj.tipo == TipoCargaChoices.TRANSDUTOR:
            return [CargaTransdutorInline]

        return []

    def save_model(self, request, obj, form, change):
        if obj.tag:
            obj.tag = obj.tag.upper().strip()
        if obj.descricao:
            obj.descricao = obj.descricao.upper().strip()
        if obj.local_instalacao:
            obj.local_instalacao = obj.local_instalacao.upper().strip()
        super().save_model(request, obj, form, change)