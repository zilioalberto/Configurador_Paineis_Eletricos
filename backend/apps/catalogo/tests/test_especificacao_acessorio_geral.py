from decimal import Decimal

from django.core.exceptions import ValidationError
import pytest

from apps.catalogo.api.serializers import ProdutoWriteSerializer
from apps.catalogo.models import EspecificacaoAcessorioGeral, Produto
from apps.catalogo.selectors.acessorios_gerais import selecionar_acessorios_gerais
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    PortePainelAcessoriosChoices,
    TipoAcessorioGeralChoices,
    UnidadeMedidaChoices,
)


def _produto(codigo: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=f"Kit {codigo}",
        categoria=CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


@pytest.mark.django_db
def test_acessorio_geral_valida_faixa_invertida():
    spec = EspecificacaoAcessorioGeral(
        produto=_produto("KIT-INV"),
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=PortePainelAcessoriosChoices.MEDIO,
        largura_min_mm=Decimal("1000.00"),
        largura_max_mm=Decimal("800.00"),
    )

    with pytest.raises(ValidationError) as exc:
        spec.full_clean()

    assert "largura_min_mm" in exc.value.message_dict


@pytest.mark.django_db
def test_selecionar_acessorio_geral_por_porte_e_dimensoes():
    produto = _produto("KIT-M")
    EspecificacaoAcessorioGeral.objects.create(
        produto=produto,
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=PortePainelAcessoriosChoices.MEDIO,
        largura_max_mm=Decimal("1000.00"),
        altura_max_mm=Decimal("1200.00"),
        quantidade_padrao=Decimal("1.00"),
    )
    fora_faixa = _produto("KIT-M-FORA")
    EspecificacaoAcessorioGeral.objects.create(
        produto=fora_faixa,
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=PortePainelAcessoriosChoices.MEDIO,
        largura_max_mm=Decimal("600.00"),
        altura_max_mm=Decimal("600.00"),
        quantidade_padrao=Decimal("1.00"),
    )

    qs = selecionar_acessorios_gerais(
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=PortePainelAcessoriosChoices.MEDIO,
        largura_mm=Decimal("800.00"),
        altura_mm=Decimal("1000.00"),
    )

    assert list(qs) == [produto]


@pytest.mark.django_db
def test_produto_write_serializer_cria_especificacao_acessorio_geral():
    serializer = ProdutoWriteSerializer(
        data={
            "codigo": "KIT-GER-M",
            "descricao": "Kit acessórios gerais médio",
            "categoria": CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
            "unidade_medida": UnidadeMedidaChoices.UN,
            "custo_referencia": "25.00",
            "especificacao_acessorio_geral": {
                "tipo_acessorio": TipoAcessorioGeralChoices.KIT_MONTAGEM,
                "porte_painel": PortePainelAcessoriosChoices.MEDIO,
                "largura_max_mm": "1000.00",
                "altura_max_mm": "1200.00",
                "quantidade_padrao": "1.00",
            },
        }
    )

    assert serializer.is_valid(), serializer.errors
    produto = serializer.save()

    assert produto.especificacao_acessorio_geral.porte_painel == PortePainelAcessoriosChoices.MEDIO
    assert produto.especificacao_acessorio_geral.quantidade_padrao == Decimal("1.00")
