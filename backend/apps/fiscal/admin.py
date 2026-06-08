"""Registo Django Admin do módulo fiscal."""
from django.contrib import admin

from apps.fiscal.models import (
    ControleNSU,
    DocumentoFiscalEmitido,
    DocumentoFiscalRecebido,
    ItemDocumentoFiscal,
    ItemDocumentoFiscalEmitido,
    ItemFiscalProduto,
)


@admin.register(ItemFiscalProduto)
class ItemFiscalProdutoAdmin(admin.ModelAdmin):
    list_display = (
        "produto",
        "cfop",
        "objetivo_entrada",
        "cst_icms",
        "csosn",
        "n_item_nfe",
        "criado_em",
    )
    list_filter = ("cfop", "objetivo_entrada")
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


class ItemDocumentoFiscalEmitidoInline(admin.TabularInline):
    model = ItemDocumentoFiscalEmitido
    extra = 0
    can_delete = False
    readonly_fields = (
        "numero_item",
        "codigo",
        "descricao",
        "ncm",
        "cfop",
        "unidade",
        "quantidade",
        "valor_unitario",
        "valor_total",
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
        "objetivo_entrada",
        "manifestacao_status",
        "manifestacao_tipo",
    )
    search_fields = ("chave_acesso", "numero", "nome_emitente", "cnpj_emitente")
    list_filter = (
        "status_importacao",
        "origem_importacao",
        "objetivo_entrada",
        "manifestacao_status",
        "data_emissao",
    )
    readonly_fields = ("criada_em", "atualizada_em")
    inlines = [ItemDocumentoFiscalInline]


@admin.register(DocumentoFiscalEmitido)
class DocumentoFiscalEmitidoAdmin(admin.ModelAdmin):
    list_display = (
        "numero",
        "serie",
        "tipo_documento",
        "nome_destinatario",
        "cnpj_destinatario",
        "data_emissao",
        "valor_total",
        "objetivo_saida",
        "origem_importacao",
    )
    search_fields = (
        "identificador",
        "chave_acesso",
        "numero",
        "nome_destinatario",
        "cnpj_destinatario",
    )
    list_filter = ("tipo_documento", "objetivo_saida", "origem_importacao", "data_emissao")
    readonly_fields = ("criada_em", "atualizada_em")
    inlines = [ItemDocumentoFiscalEmitidoInline]
