"""Registo Django Admin do módulo fiscal."""
from django.contrib import admin

from apps.fiscal.models import (
    ControleNSU,
    DocumentoFiscalRecebido,
    ItemDocumentoFiscal,
    ItemFiscalProduto,
)


@admin.register(ItemFiscalProduto)
class ItemFiscalProdutoAdmin(admin.ModelAdmin):
    list_display = ("produto", "cfop", "cst_icms", "csosn", "n_item_nfe", "criado_em")
    list_filter = ("cfop",)
    search_fields = ("produto__codigo", "produto__descricao", "rotulo")
    raw_id_fields = ("produto",)


@admin.register(ControleNSU)
class ControleNSUAdmin(admin.ModelAdmin):
    list_display = (
        "cnpj",
        "ultimo_nsu",
        "max_nsu",
        "ultimo_cstat",
        "bloqueado_ate",
        "ultima_consulta",
        "atualizado_em",
    )
    search_fields = ("cnpj",)
    readonly_fields = ("criado_em", "atualizado_em")


class ItemDocumentoFiscalInline(admin.TabularInline):
    model = ItemDocumentoFiscal
    extra = 0
    can_delete = False
    readonly_fields = (
        "numero_item",
        "codigo_fornecedor",
        "descricao",
        "ncm",
        "cfop",
        "unidade",
        "quantidade",
        "valor_unitario",
        "valor_total",
        "importado_para_produto",
        "criado_em",
        "atualizado_em",
    )

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(DocumentoFiscalRecebido)
class DocumentoFiscalRecebidoAdmin(admin.ModelAdmin):
    list_display = (
        "numero",
        "serie",
        "chave_acesso",
        "nome_emitente",
        "cnpj_emitente",
        "data_emissao",
        "valor_total",
        "status_importacao",
        "origem_importacao",
        "manifestacao_status",
        "manifestacao_tipo",
    )
    search_fields = ("chave_acesso", "numero", "nome_emitente", "cnpj_emitente")
    list_filter = (
        "status_importacao",
        "origem_importacao",
        "manifestacao_status",
        "data_emissao",
    )
    readonly_fields = ("criada_em", "atualizada_em")
    inlines = [ItemDocumentoFiscalInline]
