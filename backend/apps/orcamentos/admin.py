"""Registo Django Admin de orçamentos e margens por cliente."""
from django.contrib import admin

from apps.orcamentos.models import ConfiguracaoMargemCliente, Orcamento, OrcamentoItem


class OrcamentoItemInline(admin.TabularInline):
    model = OrcamentoItem
    extra = 0


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
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
    inlines = (OrcamentoItemInline,)


@admin.register(ConfiguracaoMargemCliente)
class ConfiguracaoMargemClienteAdmin(admin.ModelAdmin):
    list_display = (
        "cliente",
        "margem_produtos_percentual",
        "margem_servicos_percentual",
        "atualizado_em",
    )
    search_fields = ("cliente__razao_social", "cliente__documento")
