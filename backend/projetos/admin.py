from django.contrib import admin

from .models import Projeto


@admin.register(Projeto)
class ProjetoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "nome",
        "cliente",
        "tensao_nominal",
        "numero_fases",
        "frequencia",
        "ativo",
    )

    search_fields = (
        "codigo",
        "nome",
        "cliente",
    )

    list_filter = (
        "ativo",
        "tensao_nominal",
        "numero_fases",
        "frequencia",
    )

    fieldsets = (
        ("Informações Gerais", {
            "fields": (
                "codigo",
                "nome",
                "descricao",
                "cliente",
            )
        }),
        ("Dados Elétricos Provisórios", {
            "fields": (
                "tensao_nominal",
                "numero_fases",
                "frequencia",
            )
        }),
        ("Status", {
            "fields": (
                "ativo",
            )
        }),
    )