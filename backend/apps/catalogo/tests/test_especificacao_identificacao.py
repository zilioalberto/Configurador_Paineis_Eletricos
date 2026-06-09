from decimal import Decimal

from django.core.exceptions import ValidationError
import pytest

from apps.catalogo.api.serializers import ProdutoWriteSerializer
from apps.catalogo.models import EspecificacaoIdentificacao, Produto
from apps.catalogo.selectors.identificacoes import selecionar_identificacoes
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    TamanhoPlaquetaIdentificacaoChoices,
    TipoIdentificacaoChoices,
    UnidadeMedidaChoices,
)


def _produto_identificacao(codigo: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=f"Identificação {codigo}",
        categoria=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


@pytest.mark.django_db
def test_plaqueta_identificacao_exige_tamanho():
    spec = EspecificacaoIdentificacao(
        produto=_produto_identificacao("ID-PL-SF"),
        tipo_identificacao=TipoIdentificacaoChoices.PLAQUETA_IDENTIFICACAO,
    )

    with pytest.raises(ValidationError) as exc:
        spec.full_clean()

    assert "tamanho_plaqueta" in exc.value.message_dict


@pytest.mark.django_db
def test_faixa_identificacao_exige_comprimento():
    spec = EspecificacaoIdentificacao(
        produto=_produto_identificacao("ID-FX-SC"),
        tipo_identificacao=TipoIdentificacaoChoices.FAIXA_IDENTIFICACAO,
    )

    with pytest.raises(ValidationError) as exc:
        spec.full_clean()

    assert "comprimento_mm" in exc.value.message_dict


@pytest.mark.django_db
def test_selector_identificacao_suporte_luva_por_secao():
    p_ok = _produto_identificacao("ID-LUVA-25")
    EspecificacaoIdentificacao.objects.create(
        produto=p_ok,
        tipo_identificacao=TipoIdentificacaoChoices.SUPORTE_LUVA_CABO,
        secao_min_mm2=Decimal("1.50"),
        secao_max_mm2=Decimal("2.50"),
    )
    p_out = _produto_identificacao("ID-LUVA-6")
    EspecificacaoIdentificacao.objects.create(
        produto=p_out,
        tipo_identificacao=TipoIdentificacaoChoices.SUPORTE_LUVA_CABO,
        secao_min_mm2=Decimal("6.00"),
        secao_max_mm2=Decimal("6.00"),
    )

    qs = selecionar_identificacoes(
        tipo_identificacao=TipoIdentificacaoChoices.SUPORTE_LUVA_CABO,
        secao_cabo_mm2=Decimal("2.50"),
    )

    assert list(qs) == [p_ok]


@pytest.mark.django_db
def test_produto_write_serializer_cria_especificacao_identificacao():
    serializer = ProdutoWriteSerializer(
        data={
            "codigo": "ID-PL-P",
            "descricao": "Plaqueta pequena",
            "categoria": CategoriaProdutoNomeChoices.IDENTIFICACAO,
            "unidade_medida": UnidadeMedidaChoices.UN,
            "preco_base": "1.00",
            "especificacao_identificacao": {
                "tipo_identificacao": TipoIdentificacaoChoices.PLAQUETA_IDENTIFICACAO,
                "tamanho_plaqueta": TamanhoPlaquetaIdentificacaoChoices.PEQUENA,
            },
        }
    )

    assert serializer.is_valid(), serializer.errors
    produto = serializer.save()

    assert (
        produto.especificacao_identificacao.tipo_identificacao
        == TipoIdentificacaoChoices.PLAQUETA_IDENTIFICACAO
    )
    assert (
        produto.especificacao_identificacao.tamanho_plaqueta
        == TamanhoPlaquetaIdentificacaoChoices.PEQUENA
    )
