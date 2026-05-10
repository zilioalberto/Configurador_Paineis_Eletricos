from django.contrib import admin

from apps.orcamentos.models import Orcamento, OrcamentoItem


class OrcamentoItemInline(admin.TabularInline):
    model = OrcamentoItem
    extra = 0


@admin.register(Orcamento)
class OrcamentoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "titulo", "status", "cliente_referencia", "criado_em")
    list_filter = ("status",)
    search_fields = ("codigo", "titulo", "cliente_referencia")
    inlines = (OrcamentoItemInline,)
