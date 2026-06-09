from decimal import Decimal

import pytest

from apps.catalogo.models import EspecificacaoCabo, Produto
from apps.catalogo.selectors.cabos import selecionar_cabos
from apps.catalogo.utils.cor_cabo import (
    normalizar_cor_cabo,
    rotulo_cor_cabo,
    valores_cor_cabo_equivalentes,
)
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    CorCaboChoices,
    MaterialCondutorChoices,
    TipoCaboChoices,
    TipoIsolacaoCaboChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("VERDE_AMARELO", CorCaboChoices.VERDE_AMARELO),
        ("VERDE/AMARELO", CorCaboChoices.VERDE_AMARELO),
        ("verde/amarelo", CorCaboChoices.VERDE_AMARELO),
        ("Verde/Amarelo", CorCaboChoices.VERDE_AMARELO),
        ("VERDE AMARELO", CorCaboChoices.VERDE_AMARELO),
        ("PRETO", CorCaboChoices.PRETO),
    ],
)
def test_normalizar_cor_cabo(entrada, esperado):
    assert normalizar_cor_cabo(entrada) == esperado


def test_rotulo_cor_cabo_verde_amarelo():
    assert rotulo_cor_cabo(CorCaboChoices.VERDE_AMARELO) == "Verde/Amarelo"


def test_valores_cor_cabo_equivalentes_inclui_variantes():
    valores = valores_cor_cabo_equivalentes(CorCaboChoices.VERDE_AMARELO)
    assert CorCaboChoices.VERDE_AMARELO in valores
    assert "VERDE/AMARELO" in valores
    assert "verde/amarelo" in valores


@pytest.mark.django_db
def test_selecionar_cabos_encontra_cor_verde_amarelo_com_variante_legada():
    produto = Produto.objects.create(
        codigo="CABO-PE-VAR",
        descricao="Cabo PE variante",
        categoria=CategoriaProdutoNomeChoices.CABO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoCabo.objects.create(
        produto=produto,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor="VERDE/AMARELO",
        flexivel=True,
    )

    encontrado = selecionar_cabos(
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2_min=Decimal("2.50"),
        numero_condutores=1,
        cor=CorCaboChoices.VERDE_AMARELO,
    ).first()

    assert encontrado is not None
    assert encontrado.id == produto.id


@pytest.mark.django_db
def test_especificacao_cabo_normaliza_cor_ao_salvar():
    produto = Produto.objects.create(
        codigo="CABO-PE-SAVE",
        descricao="Cabo PE save",
        categoria=CategoriaProdutoNomeChoices.CABO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    espec = EspecificacaoCabo.objects.create(
        produto=produto,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("4.00"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor="verde/amarelo",
        flexivel=True,
    )

    assert espec.cor == CorCaboChoices.VERDE_AMARELO
