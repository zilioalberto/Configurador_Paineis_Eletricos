from decimal import Decimal

import pytest

from cargas.models import Carga, CargaResistencia, CargaValvula
from catalogo.models import EspecificacaoReleInterface, Produto
from composicao_painel.services.sugestoes.reles_interface import (
    gerar_sugestoes_reles_interface,
    processar_sugestao_rele_interface_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
    TipoCorrenteChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
    TipoReleInterfaceValvulaChoices,
)
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    TipoContatoChoices,
    TipoMontagemReleChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_rele_interface_valvula_corrente_ma_para_contato_a(criar_projeto):
    projeto = criar_projeto(nome="RI1", codigo="21001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="V1",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("500.00"),
        quantidade_solenoides=2,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
        tipo_rele_interface=TipoReleInterfaceValvulaChoices.ESTADO_SOLIDO,
    )
    p = Produto.objects.create(
        codigo="RI-01",
        descricao="Relé IF",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleInterface.objects.create(
        produto=p,
        tipo_rele="ESTADO_SOLIDO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("1.00"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_rele_interface_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.quantidade == Decimal("2")
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.RELE_INTERFACE
    assert sug.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA


@pytest.mark.django_db
def test_rele_interface_resistencia_usa_corrente_calculada(criar_projeto):
    projeto = criar_projeto(nome="RI2", codigo="21002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_INTERFACE,
        tipo_rele_interface=TipoReleInterfaceValvulaChoices.ELETROMECANICA,
        potencia_kw=Decimal("5"),
    )
    r = CargaResistencia.objects.get(carga=carga)
    assert r.corrente_calculada_a is not None

    p = Produto.objects.create(
        codigo="RI-02",
        descricao="Relé IF EM",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleInterface.objects.create(
        produto=p,
        tipo_rele="ELETROMECANICO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("50.00"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_rele_interface_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id


@pytest.mark.django_db
def test_gerar_sugestoes_reles_interface_projeto(criar_projeto):
    projeto = criar_projeto(nome="RI3", codigo="21003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="V2",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("100.00"),
        quantidade_solenoides=1,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
        tipo_rele_interface=TipoReleInterfaceValvulaChoices.ELETROMECANICA,
    )
    p = Produto.objects.create(
        codigo="RI-03",
        descricao="R",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleInterface.objects.create(
        produto=p,
        tipo_rele="ELETROMECANICO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("5.00"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    out = gerar_sugestoes_reles_interface(projeto)
    assert len(out) == 1
