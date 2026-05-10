from django.contrib import admin, messages
from django.core.exceptions import ValidationError

from .models import Projeto
from .services.fluxo_projeto import (
    finalizar_projeto,
    reabrir_projeto,
)

from core.choices import StatusProjetoChoices


@admin.action(description="Finalizar projeto")
def finalizar_projeto_action(modeladmin, request, queryset):
    if queryset.count() != 1:
        modeladmin.message_user(
            request,
            "Selecione exatamente 1 projeto para finalizar.",
            level=messages.WARNING,
        )
        return

    projeto = queryset.first()

    try:
        finalizar_projeto(projeto)
        modeladmin.message_user(
            request,
            f"Projeto {projeto.codigo} finalizado com sucesso.",
            level=messages.SUCCESS,
        )
    except Exception as exc:
        modeladmin.message_user(
            request,
            f"Erro ao finalizar projeto: {str(exc)}",
            level=messages.ERROR,
        )


@admin.action(description="Reabrir projeto")
def reabrir_projeto_action(modeladmin, request, queryset):
    if queryset.count() != 1:
        modeladmin.message_user(
            request,
            "Selecione exatamente 1 projeto para reabrir.",
            level=messages.WARNING,
        )
        return

    projeto = queryset.first()

    try:
        reabrir_projeto(projeto)
        modeladmin.message_user(
            request,
            f"Projeto {projeto.codigo} reaberto com sucesso.",
            level=messages.SUCCESS,
        )
    except Exception as exc:
        modeladmin.message_user(
            request,
            f"Erro ao reabrir projeto: {str(exc)}",
            level=messages.ERROR,
        )


@admin.register(Projeto)
class ProjetoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "nome",
        "cliente",
        "tipo_painel",
        "tensao_nominal",
        "tensao_comando",
        "possui_plc",
        "possui_ihm",
        "possui_climatizacao",
        "status",
        "ativo",
        "possui_seccionamento",
        "criado_em",
    )

    list_display_links = ("codigo", "nome")

    list_filter = (
        "tipo_painel",
        "tipo_corrente",
        "tipo_corrente_comando",
        "status",
        "ativo",
        "possui_seccionamento",
        "possui_neutro",
        "possui_terra",
        "possui_plc",
        "possui_ihm",
        "possui_switches",
        "possui_climatizacao",
        "tipo_climatizacao",
        "possui_plaqueta_identificacao",
        "possui_faixa_identificacao",
        "possui_adesivo_alerta",
        "possui_adesivos_tensao",
        "frequencia",
        "tensao_nominal",
        "tensao_comando",
        "criado_em",
        "atualizado_em",
    )

    search_fields = (
        "codigo",
        "nome",
        "cliente",
        "descricao",
    )

    ordering = ("codigo", "nome")

    readonly_fields = (
        "criado_em",
        "atualizado_em",
    )

    list_per_page = 25

    actions = (
        finalizar_projeto_action,
        reabrir_projeto_action,
    )

    fieldsets = (
        (
            "Identificação do Projeto",
            {
                "fields": (
                    "codigo",
                    "nome",
                    "cliente",
                    "descricao",
                    "status",
                    "ativo",
                )
            },
        ),
        (
            "Dados Gerais",
            {
                "fields": (
                    "tipo_painel",
                    "fator_demanda",
                )
            },
        ),
        (
            "Alimentação Principal",
            {
                "fields": (
                    "tipo_corrente",
                    "tensao_nominal",
                    "numero_fases",
                    "frequencia",
                    "tipo_conexao_alimentacao_potencia",
                    "possui_neutro",
                    "tipo_conexao_alimentacao_neutro",
                    "possui_terra",
                    "tipo_conexao_alimentacao_terra",
                )
            },
        ),
        (
            "Circuito de Comando",
            {
                "fields": (
                    "tipo_corrente_comando",
                    "tensao_comando",
                )
            },
        ),
        (
            "Recursos do Painel",
            {
                "fields": (
                    "possui_plc",
                    "familia_plc",
                    "possui_ihm",
                    "possui_switches",
                    "possui_climatizacao",
                    "tipo_climatizacao",
                )
            },
        ),
        (
            "Identificação e Acabamento",
            {
                "fields": (
                    "possui_plaqueta_identificacao",
                    "possui_faixa_identificacao",
                    "possui_adesivo_alerta",
                    "possui_adesivos_tensao",
                )
            },
        ),
        (
            "Seccionamento",
            {
                "fields": (
                    "possui_seccionamento",
                    "tipo_seccionamento",
                )
            },
        ),
        (
            "Controle",
            {
                "fields": (
                    "criado_em",
                    "atualizado_em",
                )
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if change:
            projeto_atual = Projeto.objects.get(pk=obj.pk)
            if projeto_atual.status == StatusProjetoChoices.FINALIZADO:
                raise ValidationError(
                    "O projeto está finalizado. Reabra o projeto antes de alterar seus dados."
                )

        super().save_model(request, obj, form, change)

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        readonly.append("codigo")

        if obj and obj.status == StatusProjetoChoices.FINALIZADO:
            readonly.extend(
                [
                    field.name
                    for field in self.model._meta.fields
                    if field.name not in readonly
                ]
            )

        return readonly