from decimal import Decimal

import pytest

from apps.catalogo.models import (
    EspecificacaoCabo,
    EspecificacaoIdentificacao,
    EspecificacaoTerminal,
    Produto,
)
from apps.configurador_paineis.cargas.models import Carga
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.acessorios_cabos import (
    gerar_sugestoes_acessorios_cabos,
)
from apps.configurador_paineis.dimensionamento.models import (
    ClassificacaoCircuitoChoices,
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
    TipoCorrenteChoices,
)
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import (
    CorCaboChoices,
    MaterialCondutorChoices,
    TipoCaboChoices,
    TipoIdentificacaoChoices,
    TipoIsolacaoCaboChoices,
    TipoTerminalChoices,
    UnidadeMedidaChoices,
)


def _produto(codigo: str, categoria: str, descricao: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=descricao,
        categoria=categoria,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


def _catalogo_acessorios_cabo():
    cabo_potencia = _produto(
        "CABO-POT-25",
        CategoriaProdutoNomeChoices.CABO,
        "Cabo potência 2,5 mm2",
    )
    EspecificacaoCabo.objects.create(
        produto=cabo_potencia,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor=CorCaboChoices.PRETO,
        flexivel=True,
    )

    cabo_potencia_vermelho = _produto(
        "CABO-POT-25-VERM",
        CategoriaProdutoNomeChoices.CABO,
        "Cabo potência vermelho 2,5 mm2",
    )
    EspecificacaoCabo.objects.create(
        produto=cabo_potencia_vermelho,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor=CorCaboChoices.VERMELHO,
        flexivel=True,
    )

    cabo_neutro = _produto(
        "CABO-N-25-AZUL",
        CategoriaProdutoNomeChoices.CABO,
        "Cabo neutro azul 2,5 mm2",
    )
    EspecificacaoCabo.objects.create(
        produto=cabo_neutro,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor=CorCaboChoices.AZUL,
        flexivel=True,
    )

    cabo_terra = _produto(
        "CABO-PE-25",
        CategoriaProdutoNomeChoices.CABO,
        "Cabo terra 2,5 mm2",
    )
    EspecificacaoCabo.objects.create(
        produto=cabo_terra,
        tipo_cabo=TipoCaboChoices.ATERRAMENTO,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor=CorCaboChoices.VERDE_AMARELO,
        flexivel=True,
    )

    terminal = _produto(
        "TERM-TUB-25",
        CategoriaProdutoNomeChoices.TERMINAIS,
        "Terminal tubular 1 a 4 mm2",
    )
    EspecificacaoTerminal.objects.create(
        produto=terminal,
        tipo_terminal=TipoTerminalChoices.TUBULAR,
        secao_min_mm2=Decimal("1.00"),
        secao_max_mm2=Decimal("4.00"),
    )

    suporte = _produto(
        "SUP-LUVA-25",
        CategoriaProdutoNomeChoices.IDENTIFICACAO,
        "Suporte luva 1 a 4 mm2",
    )
    EspecificacaoIdentificacao.objects.create(
        produto=suporte,
        tipo_identificacao=TipoIdentificacaoChoices.SUPORTE_LUVA_CABO,
        secao_min_mm2=Decimal("1.00"),
        secao_max_mm2=Decimal("4.00"),
    )

    etiqueta = _produto(
        "ETIQ-CABO",
        CategoriaProdutoNomeChoices.IDENTIFICACAO,
        "Etiqueta de cabo",
    )
    EspecificacaoIdentificacao.objects.create(
        produto=etiqueta,
        tipo_identificacao=TipoIdentificacaoChoices.ETIQUETA_CABO,
    )
    return cabo_potencia, cabo_terra, terminal, suporte, etiqueta


def _resumo_mecanico_salvo(projeto, *, altura_painel_mm=2000):
    return ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "corrente_total_painel_a": Decimal("20.00"),
            "altura_painel_mm": altura_painel_mm,
            "detalhe_dimensionamento_mecanico": {
                "layout_placa": {
                    "canaletas_verticais": [],
                    "canaletas_horizontais": [],
                    "trilhos_din": [],
                }
            },
        },
    )


@pytest.mark.django_db
def test_acessorios_cabos_gera_terminal_suporte_e_etiqueta_por_condutor_aprovado(
    criar_projeto,
):
    projeto = criar_projeto(nome="PTERM", codigo="33001-26", tensao_nominal=TensaoChoices.V380)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=2000)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor 1",
        tipo=TipoCargaChoices.MOTOR,
    )
    cabo_potencia, cabo_terra, terminal, suporte, etiqueta = _catalogo_acessorios_cabo()
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        corrente_calculada_a=Decimal("8.00"),
        corrente_projeto_a=Decimal("8.00"),
        quantidade_condutores_fase=3,
        possui_pe=True,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    sugestoes = gerar_sugestoes_acessorios_cabos(projeto)

    assert len(sugestoes) == 8
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0

    cabo_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=400,
    )
    assert cabo_fase.produto_id == cabo_potencia.id
    assert cabo_fase.quantidade == Decimal("6.00")
    assert "Quantidade de condutores: 3" in cabo_fase.memoria_calculo
    assert "Comprimento estimado por condutor: 2.00 m" in cabo_fase.memoria_calculo

    cabo_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=402,
    )
    assert cabo_pe.produto_id == cabo_terra.id
    assert cabo_pe.quantidade == Decimal("2.00")
    assert "Cor cabo: Verde/Amarelo" in cabo_pe.memoria_calculo

    terminal_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS,
        indice_escopo=200,
    )
    assert terminal_fase.produto_id == terminal.id
    assert terminal_fase.quantidade == Decimal("6")
    assert "Terminais por cabo: 2" in terminal_fase.memoria_calculo

    terminal_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS,
        indice_escopo=202,
    )
    assert terminal_pe.quantidade == Decimal("2")

    suporte_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        indice_escopo=300,
    )
    assert suporte_fase.produto_id == suporte.id
    assert suporte_fase.quantidade == Decimal("3")
    assert suporte_fase.parte_painel == PartesPainelChoices.IDENTIFICACAO

    etiqueta_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        indice_escopo=322,
    )
    assert etiqueta_pe.produto_id == etiqueta.id
    assert etiqueta_pe.quantidade == Decimal("1")


@pytest.mark.django_db
def test_acessorios_cabos_quantiza_cabo_para_carga_resistiva_trifasica(criar_projeto):
    projeto = criar_projeto(nome="PRES", codigo="33004-26", tensao_nominal=TensaoChoices.V380)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=1800)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R01",
        descricao="Resistência trifásica",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    cabo_potencia, cabo_terra, *_ = _catalogo_acessorios_cabo()
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.RESISTENCIA,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        corrente_calculada_a=Decimal("12.00"),
        corrente_projeto_a=Decimal("12.00"),
        quantidade_condutores_fase=3,
        possui_pe=True,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    gerar_sugestoes_acessorios_cabos(projeto)

    cabo_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=400,
    )
    assert cabo_fase.produto_id == cabo_potencia.id
    assert cabo_fase.quantidade == Decimal("5.40")

    cabo_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=402,
    )
    assert cabo_pe.produto_id == cabo_terra.id
    assert cabo_pe.quantidade == Decimal("1.80")


@pytest.mark.django_db
def test_acessorios_cabos_usa_azul_para_neutro(criar_projeto):
    projeto = criar_projeto(nome="PNEU", codigo="33006-26", tensao_nominal=TensaoChoices.V220)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=1500)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R02",
        descricao="Resistência monofásica",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    cabo_potencia, *_ = _catalogo_acessorios_cabo()
    cabo_neutro = Produto.objects.get(codigo="CABO-N-25-AZUL")
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.RESISTENCIA,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        corrente_calculada_a=Decimal("10.00"),
        corrente_projeto_a=Decimal("10.00"),
        quantidade_condutores_fase=1,
        possui_neutro=True,
        possui_pe=False,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_neutro_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    gerar_sugestoes_acessorios_cabos(projeto)

    cabo_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=400,
    )
    assert cabo_fase.produto_id == cabo_potencia.id
    assert cabo_fase.quantidade == Decimal("1.50")

    cabo_neutro_sug = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=401,
    )
    assert cabo_neutro_sug.produto_id == cabo_neutro.id
    assert cabo_neutro_sug.quantidade == Decimal("1.50")
    assert "Cor cabo: Azul" in cabo_neutro_sug.memoria_calculo


@pytest.mark.django_db
def test_acessorios_cabos_quantiza_cabo_para_alimentacao_geral(criar_projeto):
    projeto = criar_projeto(nome="PALIM", codigo="33005-26", tensao_nominal=TensaoChoices.V380)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=2200)
    cabo_potencia, cabo_terra, *_ = _catalogo_acessorios_cabo()
    DimensionamentoCircuitoAlimentacaoGeral.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("50.00"),
        tipo_corrente=TipoCorrenteChoices.CA,
        numero_fases=3,
        possui_neutro=False,
        possui_terra=True,
        quantidade_condutores_fase=3,
        quantidade_condutores_neutro=0,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    gerar_sugestoes_acessorios_cabos(projeto)

    cabo_fase = SugestaoItem.objects.get(
        projeto=projeto,
        carga__isnull=True,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=410,
    )
    assert cabo_fase.produto_id == cabo_potencia.id
    assert cabo_fase.quantidade == Decimal("6.60")

    cabo_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga__isnull=True,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=412,
    )
    assert cabo_pe.produto_id == cabo_terra.id
    assert cabo_pe.quantidade == Decimal("2.20")


@pytest.mark.django_db
def test_acessorios_cabos_pe_encontra_cabo_potencia_verde_amarelo(criar_projeto):
    projeto = criar_projeto(nome="PPE", codigo="33008-26", tensao_nominal=TensaoChoices.V380)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=2000)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M05",
        descricao="Motor PE potência",
        tipo=TipoCargaChoices.MOTOR,
    )
    cabo_pe_potencia = _produto(
        "CABO-PE-POT",
        CategoriaProdutoNomeChoices.CABO,
        "Cabo verde/amarelo potência 2,5 mm2",
    )
    EspecificacaoCabo.objects.create(
        produto=cabo_pe_potencia,
        tipo_cabo=TipoCaboChoices.POTENCIA,
        secao_mm2=Decimal("2.50"),
        numero_condutores=1,
        material_condutor=MaterialCondutorChoices.COBRE,
        tipo_isolacao=TipoIsolacaoCaboChoices.PVC,
        cor="verde/amarelo",
        flexivel=True,
    )
    terminal = _produto(
        "TERM-TUB-25B",
        CategoriaProdutoNomeChoices.TERMINAIS,
        "Terminal tubular 1 a 4 mm2",
    )
    EspecificacaoTerminal.objects.create(
        produto=terminal,
        tipo_terminal=TipoTerminalChoices.TUBULAR,
        secao_min_mm2=Decimal("1.00"),
        secao_max_mm2=Decimal("4.00"),
    )
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        corrente_calculada_a=Decimal("8.00"),
        corrente_projeto_a=Decimal("8.00"),
        quantidade_condutores_fase=3,
        possui_pe=True,
        secao_condutor_fase_mm2=Decimal("2.50"),
        secao_condutor_pe_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    gerar_sugestoes_acessorios_cabos(projeto)

    cabo_pe = SugestaoItem.objects.get(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        indice_escopo=402,
    )
    assert cabo_pe.produto_id == cabo_pe_potencia.id
    assert "Cor cabo: Verde/Amarelo" in cabo_pe.memoria_calculo


@pytest.mark.django_db
def test_acessorios_cabos_ignora_circuito_nao_aprovado(criar_projeto):
    projeto = criar_projeto(nome="PTERM2", codigo="33002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M02",
        descricao="Motor 2",
        tipo=TipoCargaChoices.MOTOR,
    )
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "corrente_total_painel_a": Decimal("20.00"),
            "altura_painel_mm": 2000,
            "detalhe_dimensionamento_mecanico": {
                "layout_placa": {
                    "canaletas_verticais": [],
                    "canaletas_horizontais": [],
                    "trilhos_din": [],
                }
            },
        },
    )
    _catalogo_acessorios_cabo()
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        quantidade_condutores_fase=3,
        secao_condutor_fase_mm2=Decimal("2.50"),
        condutores_aprovado=False,
    )

    sugestoes = gerar_sugestoes_acessorios_cabos(projeto)

    assert sugestoes == []
    assert SugestaoItem.objects.filter(projeto=projeto).count() == 0
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0


@pytest.mark.django_db
def test_acessorios_cabos_sem_terminal_compativel_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="PTERM3", codigo="33003-26", tensao_nominal=TensaoChoices.V380)
    _resumo_mecanico_salvo(projeto, altura_painel_mm=2000)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M03",
        descricao="Motor 3",
        tipo=TipoCargaChoices.MOTOR,
    )
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        quantidade_condutores_fase=3,
        secao_condutor_fase_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )

    sugestoes = gerar_sugestoes_acessorios_cabos(projeto)

    assert sugestoes == []
    pendencias = PendenciaItem.objects.filter(projeto=projeto).order_by("categoria_produto")
    assert pendencias.count() == 4
    assert pendencias.filter(categoria_produto=CategoriaProdutoNomeChoices.CABO).exists()
    assert pendencias.filter(categoria_produto=CategoriaProdutoNomeChoices.TERMINAIS).exists()
    assert pendencias.filter(categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO).count() == 2


@pytest.mark.django_db
def test_acessorios_cabos_aguarda_dimensionamento_mecanico_e_limpa_pendencias_antigas(
    criar_projeto,
):
    projeto = criar_projeto(nome="PTERM4", codigo="33007-26", tensao_nominal=TensaoChoices.V380)
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "corrente_total_painel_a": Decimal("20.00"),
            "altura_painel_mm": 2000,
        },
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M04",
        descricao="Motor 4",
        tipo=TipoCargaChoices.MOTOR,
    )
    DimensionamentoCircuitoCarga.objects.create(
        projeto=projeto,
        carga=carga,
        tipo_carga=TipoCargaChoices.MOTOR,
        classificacao_circuito=ClassificacaoCircuitoChoices.POTENCIA,
        quantidade_condutores_fase=3,
        secao_condutor_fase_mm2=Decimal("2.50"),
        condutores_aprovado=True,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
        descricao="Pendência antiga",
        indice_escopo=400,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.IDENTIFICACAO,
        categoria_produto=CategoriaProdutoNomeChoices.IDENTIFICACAO,
        descricao="Pendência antiga",
        indice_escopo=300,
    )

    sugestoes = gerar_sugestoes_acessorios_cabos(projeto)

    assert sugestoes == []
    assert SugestaoItem.objects.filter(projeto=projeto).count() == 0
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0
