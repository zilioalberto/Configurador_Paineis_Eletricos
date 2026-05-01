from decimal import Decimal

import pytest

from cargas.models import Carga, CargaResistencia
from catalogo.models import EspecificacaoReleEstadoSolido, Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.reles_estado_solido import (
    gerar_sugestoes_reles_estado_solido,
    processar_sugestao_rele_estado_solido_para_carga,
    reprocessar_rele_estado_solido_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.produtos import ModoMontagemChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_rele_estado_solido_resistencia_rele_acionamento_seleciona_produto(criar_projeto):
    projeto = criar_projeto(nome="RSS1", codigo="20001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("10"),
    )
    p = Produto.objects.create(
        codigo="RES-01",
        descricao="Relé SS",
        categoria=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleEstadoSolido.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("20.00"),
        numero_fases="3F",
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_rele_estado_solido_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO
    assert sug.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA
    assert "1.2" in sug.memoria_calculo
    assert "Mínimo catálogo" in sug.memoria_calculo


@pytest.mark.django_db
def test_rele_estado_solido_filtra_fases_monofasico(criar_projeto):
    projeto = criar_projeto(nome="RSS2", codigo="20002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R2",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_resistencia=TensaoChoices.V220,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("2"),
        corrente_calculada_a=Decimal("10.00"),
    )
    p3 = Produto.objects.create(
        codigo="RES-3F",
        descricao="Relé 3F",
        categoria=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleEstadoSolido.objects.create(
        produto=p3,
        corrente_nominal_a=Decimal("50.00"),
        numero_fases="3F",
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p1 = Produto.objects.create(
        codigo="RES-1F",
        descricao="Relé 1F",
        categoria=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleEstadoSolido.objects.create(
        produto=p1,
        corrente_nominal_a=Decimal("15.00"),
        numero_fases="1F",
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_rele_estado_solido_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p1.id


@pytest.mark.django_db
def test_rele_estado_solido_contator_limpa_escopo(criar_projeto):
    projeto = criar_projeto(nome="RSS3", codigo="20003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R3",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    r = CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("5"),
        corrente_calculada_a=Decimal("10.00"),
    )
    p = Produto.objects.create(
        codigo="RES-X",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleEstadoSolido.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("20.00"),
        numero_fases="3F",
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    assert processar_sugestao_rele_estado_solido_para_carga(projeto, carga) is not None
    r.tipo_acionamento = TipoAcionamentoResistenciaChoices.CONTATOR
    r.save(update_fields=["tipo_acionamento"])
    assert processar_sugestao_rele_estado_solido_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_gerar_sugestoes_reles_estado_solido_projeto(criar_projeto):
    projeto = criar_projeto(nome="RSS4", codigo="20004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R4",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("3"),
        corrente_calculada_a=Decimal("5.00"),
    )
    p = Produto.objects.create(
        codigo="RES-P",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleEstadoSolido.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("10.00"),
        numero_fases="3F",
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    out = gerar_sugestoes_reles_estado_solido(projeto)
    assert len(out) == 1


@pytest.mark.django_db
def test_reprocessar_rele_estado_solido_sem_catalogo_pendencia(criar_projeto):
    projeto = criar_projeto(nome="RSS5", codigo="20005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R5",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("100"),
        corrente_calculada_a=Decimal("200.00"),
    )
    assert reprocessar_rele_estado_solido_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
    ).exists()
