from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaSensor, CargaValvula
from catalogo.models import EspecificacaoBorne, Produto
from composicao_painel.models import SugestaoItem
from composicao_painel.services.sugestoes.bornes import (
    gerar_sugestoes_bornes,
    processar_sugestao_bornes_para_carga,
    reprocessar_bornes_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoProtecaoValvulaChoices,
    TipoSensorChoices,
)
from core.choices.eletrica import TipoSinalChoices, TipoSinaisAnalogicosChoices
from core.choices.eletrica import TipoCorrenteChoices
from core.choices.produtos import ModoMontagemChoices, TipoBorneChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_borne_valvula_borne_fusivel_usa_dois_niveis_e_quantidade_solenoides(
    criar_projeto,
):
    projeto = criar_projeto(nome="BR1", codigo="31001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VBF",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("400.00"),
        quantidade_solenoides=2,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_protecao=TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
    )
    p = Produto.objects.create(
        codigo="BR-P1",
        descricao="Borne F 2 níveis",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.FUSIVEL,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=2,
        possui_fusivel=True,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.quantidade == Decimal("2")
    assert sug.parte_painel == PartesPainelChoices.BORNES
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.BORNE


@pytest.mark.django_db
def test_borne_valvula_minidisjuntor_usa_passagem_dois_niveis(criar_projeto):
    projeto = criar_projeto(nome="BR2", codigo="31002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VMN",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("200.00"),
        quantidade_solenoides=1,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_protecao=TipoProtecaoValvulaChoices.MINIDISJUNTOR,
    )
    p = Produto.objects.create(
        codigo="BR-PAS",
        descricao="Borne passagem 2 níveis",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=2,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert "PASSAGEM" in (sug.memoria_calculo or "")


@pytest.mark.django_db
def test_borne_valvula_sem_protecao_usa_passagem_dois_niveis(criar_projeto):
    projeto = criar_projeto(nome="BR2B", codigo="31002b-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VSP",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("150.00"),
        quantidade_solenoides=4,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_protecao=TipoProtecaoValvulaChoices.SEM_PROTECAO,
    )
    p = Produto.objects.create(
        codigo="BR-PAS2",
        descricao="Borne passagem",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("2.50"),
        corrente_nominal_a=Decimal("6.00"),
        numero_niveis=2,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.quantidade == Decimal("4")


@pytest.mark.django_db
def test_gerar_sugestoes_bornes_projeto(criar_projeto):
    projeto = criar_projeto(nome="BR3", codigo="31003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VB2",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("100.00"),
        quantidade_solenoides=1,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_protecao=TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
    )
    p = Produto.objects.create(
        codigo="BR-P3",
        descricao="Borne",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.FUSIVEL,
        secao_max_mm2=Decimal("2.50"),
        corrente_nominal_a=Decimal("5.00"),
        numero_niveis=2,
        possui_fusivel=True,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    out = gerar_sugestoes_bornes(projeto)
    assert len(out) == 1


@pytest.mark.django_db
def test_reprocessar_bornes_para_carga(criar_projeto):
    projeto = criar_projeto(nome="BR4", codigo="31004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VRP",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("250.00"),
        quantidade_solenoides=3,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_protecao=TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
    )
    p = Produto.objects.create(
        codigo="BR-P4",
        descricao="Borne",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.FUSIVEL,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=2,
        possui_fusivel=True,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    with patch(
        "composicao_painel.services.sugestoes.bornes.selecionar_bornes",
        return_value=Produto.objects.filter(pk=p.pk),
    ):
        sug = reprocessar_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.quantidade == Decimal("3")


@pytest.mark.django_db
def test_borne_sensor_ate_3_fios_passagem_tres_niveis_qtd_1(criar_projeto):
    projeto = criar_projeto(nome="BRS1", codigo="31101-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S3F",
        descricao="Sensor",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        corrente_consumida_ma=Decimal("50.00"),
        quantidade_fios=3,
    )
    p = Produto.objects.create(
        codigo="BR-S3",
        descricao="Borne passagem 3 níveis",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=3,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.quantidade == Decimal("1")
    assert "Níveis: 3" in (sug.memoria_calculo or "")
    assert SugestaoItem.objects.filter(projeto=projeto, carga=carga).count() == 1


@pytest.mark.django_db
def test_borne_sensor_mais_de_3_fios_passagem_um_nivel_qtd_igual_fios(criar_projeto):
    projeto = criar_projeto(nome="BRS2", codigo="31102-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S5F",
        descricao="Sensor",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor=TipoSensorChoices.ENCODER,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        corrente_consumida_ma=Decimal("80.00"),
        quantidade_fios=5,
    )
    p = Produto.objects.create(
        codigo="BR-S1",
        descricao="Borne passagem 1 nível",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=1,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.quantidade == Decimal("5")


@pytest.mark.django_db
def test_borne_sensor_sem_quantidade_fios_nao_sugere(criar_projeto):
    from composicao_painel.models import PendenciaItem

    projeto = criar_projeto(nome="BRS3", codigo="31103-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="SNF",
        descricao="Sensor",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        quantidade_fios=None,
    )
    assert processar_sugestao_bornes_para_carga(projeto, carga) is None
    p = PendenciaItem.objects.get(projeto=projeto, carga=carga)
    assert "fios" in p.descricao.lower()


@pytest.mark.django_db
def test_borne_sensor_analogico_inclui_passagem_e_terra(criar_projeto):
    projeto = criar_projeto(nome="BRS4", codigo="31104-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="SAN",
        descricao="Sensor analógico",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
        tipo_sinal=TipoSinalChoices.ANALOGICO,
        tipo_sinal_analogico=TipoSinaisAnalogicosChoices.CORRENTE_4_20MA,
        corrente_consumida_ma=Decimal("60.00"),
        quantidade_fios=3,
    )
    p_pass = Produto.objects.create(
        codigo="BR-S3A",
        descricao="Borne passagem 3 níveis",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p_pass,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=3,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p_terra = Produto.objects.create(
        codigo="BR-TE1",
        descricao="Borne terra",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p_terra,
        tipo_borne=TipoBorneChoices.TERRA,
        secao_max_mm2=Decimal("16.00"),
        corrente_nominal_a=Decimal("125.00"),
        numero_niveis=1,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    processar_sugestao_bornes_para_carga(projeto, carga)
    sugs = SugestaoItem.objects.filter(projeto=projeto, carga=carga).order_by("indice_escopo")
    assert sugs.count() == 2
    assert sugs[0].produto_id == p_pass.id
    assert sugs[0].indice_escopo == 0
    assert sugs[1].produto_id == p_terra.id
    assert sugs[1].indice_escopo == 1
    assert sugs[1].quantidade == Decimal("1")
    assert TipoBorneChoices.TERRA in (sugs[1].memoria_calculo or "")


@pytest.mark.django_db
def test_borne_sensor_analogico_sem_terra_no_catalogo_gera_pendencia(criar_projeto):
    from composicao_painel.models import PendenciaItem

    projeto = criar_projeto(nome="BRS5", codigo="31105-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="SAN2",
        descricao="Sensor analógico",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
        tipo_sinal=TipoSinalChoices.ANALOGICO,
        tipo_sinal_analogico=TipoSinaisAnalogicosChoices.TENSAO_0_10VCC,
        corrente_consumida_ma=Decimal("40.00"),
        quantidade_fios=2,
    )
    p_pass = Produto.objects.create(
        codigo="BR-S2A",
        descricao="Borne passagem 3 níveis",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoBorne.objects.create(
        produto=p_pass,
        tipo_borne=TipoBorneChoices.PASSAGEM,
        secao_max_mm2=Decimal("4.00"),
        corrente_nominal_a=Decimal("10.00"),
        numero_niveis=3,
        possui_fusivel=False,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_bornes_para_carga(projeto, carga)
    assert sug is not None
    assert SugestaoItem.objects.filter(projeto=projeto, carga=carga).count() == 1
    pend_terra = PendenciaItem.objects.get(
        projeto=projeto, carga=carga, indice_escopo=1
    )
    assert "terra" in pend_terra.descricao.lower()
