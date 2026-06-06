from django.contrib import admin

from apps.notificacoes.models import NotificacaoInterna


@admin.register(NotificacaoInterna)
class NotificacaoInternaAdmin(admin.ModelAdmin):
    list_display = ("titulo", "destinatario", "tipo", "lida", "criado_em")
    list_filter = ("tipo", "lida", "referencia_app")
    search_fields = ("titulo", "mensagem", "destinatario__email")
    readonly_fields = ("criado_em", "lida_em")
