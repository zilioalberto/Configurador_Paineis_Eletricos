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


class CargaValvulaInline(admin.StackedInline):
    model = CargaValvula
    extra = 0
    max_num = 1
    can_delete = True


class CargaResistenciaInline(admin.StackedInline):
    model = CargaResistencia
    extra = 0
    max_num = 1
    can_delete = True


class CargaSensorInline(admin.StackedInline):
    model = CargaSensor
    extra = 0
    max_num = 1
    can_delete = True


class CargaTransdutorInline(admin.StackedInline):
    model = CargaTransdutor
    extra = 0
    max_num = 1
    can_delete = True


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
        ("Status", {
            "fields": (
                "ativo",
            )
        }),
    )

    def get_inlines(self, request, obj=None):
        """
        Na criação, não mostra nenhum inline.
        Após salvar, mostra apenas o inline compatível com o tipo da carga.
        """
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