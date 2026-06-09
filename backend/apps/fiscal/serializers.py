"""
Serializers fiscais aninhados no catálogo (leitura e escrita de ItemFiscalProduto).
"""
from rest_framework import serializers

from apps.fiscal.models import ItemFiscalProduto


class ItemFiscalProdutoSerializer(serializers.ModelSerializer):
    """Leitura de item fiscal em detalhe de produto."""

    class Meta:
        model = ItemFiscalProduto
        fields = (
            "id",
            "criado_em",
            "atualizado_em",
            "ordem",
            "rotulo",
            "cfop",
            "objetivo_entrada",
            "origem_mercadoria",
            "cst_icms",
            "csosn",
            "icms_grupo_xml",
            "mod_bc_icms",
            "v_bc_icms",
            "p_icms",
            "v_icms",
            "cst_ipi",
            "v_bc_ipi",
            "p_ipi",
            "v_ipi",
            "cst_pis",
            "v_bc_pis",
            "p_pis",
            "v_pis",
            "cst_cofins",
            "v_bc_cofins",
            "p_cofins",
            "v_cofins",
            "n_item_nfe",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class ItemFiscalProdutoWriteSerializer(serializers.ModelSerializer):
    """Escrita aninhada em ``ProdutoWriteSerializer`` (sem ``produto`` no payload)."""

    class Meta:
        model = ItemFiscalProduto
        fields = (
            "ordem",
            "rotulo",
            "cfop",
            "objetivo_entrada",
            "origem_mercadoria",
            "cst_icms",
            "csosn",
            "icms_grupo_xml",
            "mod_bc_icms",
            "v_bc_icms",
            "p_icms",
            "v_icms",
            "cst_ipi",
            "v_bc_ipi",
            "p_ipi",
            "v_ipi",
            "cst_pis",
            "v_bc_pis",
            "p_pis",
            "v_pis",
            "cst_cofins",
            "v_bc_cofins",
            "p_cofins",
            "v_cofins",
            "n_item_nfe",
        )
