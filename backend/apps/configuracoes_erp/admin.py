from django.contrib import admin

from apps.configuracoes_erp.models import ParametroConfiguracao


@admin.register(ParametroConfiguracao)
class ParametroConfiguracaoAdmin(admin.ModelAdmin):
    list_display = ("chave", "descricao", "atualizado_em")
    search_fields = ("chave", "descricao")
