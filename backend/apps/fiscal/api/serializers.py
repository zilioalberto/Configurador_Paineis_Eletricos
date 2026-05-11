from rest_framework import serializers

from apps.fiscal.models import ItemFiscalProduto


class ItemFiscalProdutoListSerializer(serializers.ModelSerializer):
    """Listagem com produto (somente leitura)."""

    produto_id = serializers.UUIDField(read_only=True)
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True)
    produto_descricao = serializers.CharField(source="produto.descricao", read_only=True)

    class Meta:
        model = ItemFiscalProduto
        fields = (
            "id",
            "criado_em",
            "atualizado_em",
            "produto_id",
            "produto_codigo",
            "produto_descricao",
            "ordem",
            "rotulo",
            "cfop",
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
        read_only_fields = fields
