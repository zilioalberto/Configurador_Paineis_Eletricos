import pytest
from django.core.exceptions import ValidationError

from apps.catalogo.models import (
    EspecificacaoExpansaoPLC,
    EspecificacaoPLC,
    Produto,
)
from core.choices import CategoriaProdutoNomeChoices
from core.choices.produtos import (
    TipoAnalogicoPlcChoices,
    TipoExpansaoPLCChoices,
    UnidadeMedidaChoices,
)


def _produto(codigo: str, categoria: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=f"Produto {codigo}",
        categoria=categoria,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


@pytest.mark.django_db
def test_especificacao_plc_normaliza_familia_e_limpa_tipo_sem_entrada_analogica():
    spec = EspecificacaoPLC(
        produto=_produto("PLC-001", CategoriaProdutoNomeChoices.PLC),
        familia="  Siemens   S7 1200  ",
        modelo_cpu="CPU 1214C",
        entradas_analogicas=0,
        tipo_entradas_analogicas=TipoAnalogicoPlcChoices.MA_4_20,
        saidas_analogicas=0,
        tipo_saidas_analogicas=TipoAnalogicoPlcChoices.V_0_10,
    )

    spec.full_clean()

    assert spec.familia == "Siemens S7 1200"
    assert spec.tipo_entradas_analogicas is None
    assert spec.tipo_saidas_analogicas is None
    assert str(spec) == "PLC CPU 1214C"


@pytest.mark.django_db
def test_especificacao_plc_exige_tipo_quando_existem_pontos_analogicos():
    spec = EspecificacaoPLC(
        produto=_produto("PLC-002", CategoriaProdutoNomeChoices.PLC),
        entradas_analogicas=1,
        saidas_analogicas=1,
    )

    with pytest.raises(ValidationError) as excinfo:
        spec.full_clean()

    assert "tipo_entradas_analogicas" in excinfo.value.message_dict

    spec.tipo_entradas_analogicas = TipoAnalogicoPlcChoices.MA_4_20
    with pytest.raises(ValidationError) as excinfo:
        spec.full_clean()

    assert "tipo_saidas_analogicas" in excinfo.value.message_dict


@pytest.mark.django_db
def test_especificacao_plc_bloqueia_familia_duplicada_normalizada():
    EspecificacaoPLC.objects.create(
        produto=_produto("PLC-003", CategoriaProdutoNomeChoices.PLC),
        familia="Siemens S7-1200",
    )
    duplicada = EspecificacaoPLC(
        produto=_produto("PLC-004", CategoriaProdutoNomeChoices.PLC),
        familia="  siemens   s7 1200 ",
    )

    with pytest.raises(ValidationError) as excinfo:
        duplicada.full_clean()

    assert "familia" in excinfo.value.message_dict


@pytest.mark.django_db
def test_especificacao_plc_str_usa_produto_quando_sem_label():
    produto = _produto("PLC-005", CategoriaProdutoNomeChoices.PLC)
    spec = EspecificacaoPLC(produto=produto)

    assert str(spec) == f"PLC - {produto}"


@pytest.mark.django_db
def test_expansao_plc_exige_pelo_menos_um_ponto_io():
    spec = EspecificacaoExpansaoPLC(
        produto=_produto("EXP-001", CategoriaProdutoNomeChoices.EXPANSAO_PLC),
        tipo_expansao=TipoExpansaoPLCChoices.MISTA_GERAL,
    )

    with pytest.raises(ValidationError, match="pelo menos um ponto de I/O"):
        spec.full_clean()


@pytest.mark.django_db
def test_expansao_plc_normaliza_familia_e_limpa_tipo_sem_analogico():
    spec = EspecificacaoExpansaoPLC(
        produto=_produto("EXP-002", CategoriaProdutoNomeChoices.EXPANSAO_PLC),
        tipo_expansao=TipoExpansaoPLCChoices.ENTRADA_DIGITAL,
        familia_plc="  Siemens   S7 1200  ",
        entradas_digitais=8,
        tipo_sinal_analogico=TipoAnalogicoPlcChoices.MA_4_20,
    )

    spec.full_clean()

    assert spec.familia_plc == "Siemens S7 1200"
    assert spec.tipo_sinal_analogico is None
    assert str(spec).endswith("DI:8 DO:0 AI:0 AO:0")


@pytest.mark.django_db
def test_expansao_plc_exige_tipo_quando_tem_analogico():
    spec = EspecificacaoExpansaoPLC(
        produto=_produto("EXP-003", CategoriaProdutoNomeChoices.EXPANSAO_PLC),
        tipo_expansao=TipoExpansaoPLCChoices.ENTRADA_ANALOGICA,
        entradas_analogicas=2,
    )

    with pytest.raises(ValidationError) as excinfo:
        spec.full_clean()

    assert "tipo_sinal_analogico" in excinfo.value.message_dict


@pytest.mark.django_db
def test_expansao_plc_bloqueia_familia_duplicada_normalizada():
    EspecificacaoExpansaoPLC.objects.create(
        produto=_produto("EXP-004", CategoriaProdutoNomeChoices.EXPANSAO_PLC),
        tipo_expansao=TipoExpansaoPLCChoices.ENTRADA_DIGITAL,
        familia_plc="Siemens S7-1200",
        entradas_digitais=8,
    )
    duplicada = EspecificacaoExpansaoPLC(
        produto=_produto("EXP-005", CategoriaProdutoNomeChoices.EXPANSAO_PLC),
        tipo_expansao=TipoExpansaoPLCChoices.SAIDA_DIGITAL,
        familia_plc="siemens s7 1200",
        saidas_digitais=8,
    )

    with pytest.raises(ValidationError) as excinfo:
        duplicada.full_clean()

    assert "familia_plc" in excinfo.value.message_dict
