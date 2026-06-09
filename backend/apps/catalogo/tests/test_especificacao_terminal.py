from decimal import Decimal

from django.core.exceptions import ValidationError
import pytest

from apps.catalogo.api.serializers import ProdutoWriteSerializer
from apps.catalogo.models import EspecificacaoBorne, EspecificacaoTerminal, Produto
from apps.catalogo.selectors.terminais import selecionar_terminais
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    FuroTerminalOlhalChoices,
    ModoMontagemChoices,
    TipoBorneChoices,
    TipoTerminalChoices,
    UnidadeMedidaChoices,
)


def _produto_terminal(codigo: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=f"Terminal {codigo}",
        categoria=CategoriaProdutoNomeChoices.TERMINAIS,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


@pytest.mark.django_db
def test_terminal_olhal_exige_furo():
    spec = EspecificacaoTerminal(
        produto=_produto_terminal("TER-OLH-SF"),
        tipo_terminal=TipoTerminalChoices.OLHAL_PRE_ISOLADO,
        secao_min_mm2=Decimal("2.50"),
        secao_max_mm2=Decimal("2.50"),
    )

    with pytest.raises(ValidationError) as exc:
        spec.full_clean()

    assert "furo_olhal" in exc.value.message_dict


@pytest.mark.django_db
def test_terminal_tubular_limpa_furo_olhal():
    spec = EspecificacaoTerminal.objects.create(
        produto=_produto_terminal("TER-TUB"),
        tipo_terminal=TipoTerminalChoices.TUBULAR,
        secao_min_mm2=Decimal("1.50"),
        secao_max_mm2=Decimal("1.50"),
        furo_olhal=FuroTerminalOlhalChoices.M4,
    )

    spec.full_clean()
    spec.save()

    spec.refresh_from_db()
    assert spec.furo_olhal == ""


@pytest.mark.django_db
def test_selecionar_terminal_olhal_por_bitola_e_furo():
    p_ok = _produto_terminal("TER-OK")
    EspecificacaoTerminal.objects.create(
        produto=p_ok,
        tipo_terminal=TipoTerminalChoices.OLHAL_NAO_ISOLADO,
        secao_min_mm2=Decimal("2.50"),
        secao_max_mm2=Decimal("2.50"),
        furo_olhal=FuroTerminalOlhalChoices.M6,
    )
    p_furo_errado = _produto_terminal("TER-M8")
    EspecificacaoTerminal.objects.create(
        produto=p_furo_errado,
        tipo_terminal=TipoTerminalChoices.OLHAL_NAO_ISOLADO,
        secao_min_mm2=Decimal("2.50"),
        secao_max_mm2=Decimal("2.50"),
        furo_olhal=FuroTerminalOlhalChoices.M8,
    )

    qs = selecionar_terminais(
        tipo_terminal=TipoTerminalChoices.OLHAL_NAO_ISOLADO,
        secao_cabo_mm2=Decimal("2.50"),
        furo_olhal=FuroTerminalOlhalChoices.M6,
    )

    assert list(qs) == [p_ok]


@pytest.mark.django_db
def test_produto_write_serializer_cria_especificacao_terminal():
    serializer = ProdutoWriteSerializer(
        data={
            "codigo": "TER-SER",
            "descricao": "Terminal tubular 1,5 mm2",
            "categoria": CategoriaProdutoNomeChoices.TERMINAIS,
            "unidade_medida": UnidadeMedidaChoices.UN,
            "preco_base": "0.50",
            "especificacao_terminal": {
                "tipo_terminal": TipoTerminalChoices.TUBULAR,
                "secao_min_mm2": "1.50",
                "secao_max_mm2": "1.50",
            },
        }
    )

    assert serializer.is_valid(), serializer.errors
    produto = serializer.save()

    assert produto.especificacao_terminal.tipo_terminal == TipoTerminalChoices.TUBULAR
    assert produto.especificacao_terminal.secao_max_mm2 == Decimal("1.50")


@pytest.mark.django_db
def test_produto_write_serializer_salva_acessorios_compativeis_borne():
    tampa = Produto.objects.create(
        codigo="1514400000",
        descricao="Tampa compatível",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=tampa,
        tipo_borne=TipoBorneChoices.TAMPA,
        secao_max_mm2=Decimal("0.00"),
        numero_niveis=1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    serializer = ProdutoWriteSerializer(
        data={
            "codigo": "1521850000",
            "descricao": "Borne passagem",
            "categoria": CategoriaProdutoNomeChoices.BORNE,
            "unidade_medida": UnidadeMedidaChoices.UN,
            "preco_base": "1.00",
            "especificacao_borne": {
                "tipo_borne": TipoBorneChoices.PASSAGEM,
                "secao_max_mm2": "2.50",
                "numero_niveis": 1,
            },
            "acessorios_compativeis": [
                {
                    "acessorio": str(tampa.id),
                    "tipo_acessorio": TipoBorneChoices.TAMPA,
                    "quantidade_padrao": "1.00",
                    "prioridade": 0,
                    "observacoes": "",
                }
            ],
        }
    )

    assert serializer.is_valid(), serializer.errors
    produto = serializer.save()

    rel = produto.acessorios_compativeis.get()
    assert rel.acessorio_id == tampa.id
    assert rel.tipo_acessorio == TipoBorneChoices.TAMPA
