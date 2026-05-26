"""Registo Django Admin de orçamentos e margens por cliente."""
from django.contrib import admin

from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoItem,
    OrcamentoSnapshot,
)


class OrcamentoConfiguradorPainelInline(admin.TabularInline):
    model = OrcamentoConfiguradorPainel
    extra = 0
    readonly_fields = ("projeto_configurador", "sincronizado_em")


class OrcamentoItemInline(admin.TabularInline):
    model = OrcamentoItem
    extra = 0


class OrcamentoSnapshotInline(admin.StackedInline):
    model = OrcamentoSnapshot
    extra = 0
    can_delete = False
    readonly_fields = (
        "codigo",
        "status_orcamento",
        "total",
        "gerado_por",
        "gerado_em",
        "dados",
        "itens",
    )


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "codigo_base",
        "revisao",
        "tipo_revisao",
        "titulo",
        "status",
        "cliente",
        "contato_cliente",
        "criado_por",
        "atualizado_por",
        "criado_em",
    )
    list_filter = ("status",)
    search_fields = ("codigo", "titulo", "cliente_referencia", "cliente__razao_social")
    inlines = (OrcamentoConfiguradorPainelInline, OrcamentoItemInline, OrcamentoSnapshotInline)


@admin.register(ConfiguracaoMargemCliente)
class ConfiguracaoMargemClienteAdmin(admin.ModelAdmin):
    list_display = (
        "cliente",
        "margem_produtos_percentual",
        "margem_servicos_percentual",
        "atualizado_em",
    )
    search_fields = ("cliente__razao_social", "cliente__documento")


@admin.register(OrcamentoSnapshot)
class OrcamentoSnapshotAdmin(admin.ModelAdmin):
    list_display = ("codigo", "orcamento", "status_orcamento", "total", "gerado_por", "gerado_em")
    search_fields = ("codigo", "orcamento__codigo", "orcamento__titulo")
    readonly_fields = ("orcamento", "codigo", "status_orcamento", "total", "gerado_por", "gerado_em", "dados", "itens")
