from django.contrib import admin

from apps.cadastros.models import ContatoParceiro, EnderecoParceiro, ParceiroComercial, SocioParceiro


class EnderecoParceiroInline(admin.TabularInline):
    model = EnderecoParceiro
    extra = 0


class ContatoParceiroInline(admin.TabularInline):
    model = ContatoParceiro
    extra = 0


class SocioParceiroInline(admin.TabularInline):
    model = SocioParceiro
    extra = 0


@admin.register(ParceiroComercial)
class ParceiroComercialAdmin(admin.ModelAdmin):
    list_display = (
        "razao_social",
        "documento",
        "tipo_pessoa",
        "eh_cliente",
        "eh_fornecedor",
        "eh_parceiro",
        "ativo",
    )
    list_filter = (
        "tipo_pessoa",
        "eh_cliente",
        "eh_fornecedor",
        "eh_parceiro",
        "ativo",
        "origem",
    )
    search_fields = ("razao_social", "nome_fantasia", "documento", "email")
    inlines = (EnderecoParceiroInline, ContatoParceiroInline, SocioParceiroInline)


@admin.register(EnderecoParceiro)
class EnderecoParceiroAdmin(admin.ModelAdmin):
    list_display = ("parceiro", "nome", "municipio", "uf", "principal")
    list_filter = ("uf", "principal")
    search_fields = ("parceiro__razao_social", "logradouro", "municipio", "cep")


@admin.register(ContatoParceiro)
class ContatoParceiroAdmin(admin.ModelAdmin):
    list_display = ("parceiro", "nome", "cargo", "email", "telefone", "principal")
    search_fields = ("parceiro__razao_social", "nome", "email", "telefone")
