from django.contrib import admin

from apps.fiscal.models import ItemFiscalProduto


@admin.register(ItemFiscalProduto)
class ItemFiscalProdutoAdmin(admin.ModelAdmin):
    list_display = ("produto", "cfop", "cst_icms", "csosn", "n_item_nfe", "criado_em")
    list_filter = ("cfop",)
    search_fields = ("produto__codigo", "produto__descricao", "rotulo")
    raw_id_fields = ("produto",)
