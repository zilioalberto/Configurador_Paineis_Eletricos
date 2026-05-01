from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaResistencia
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.contatoras import (
    _validar_projeto_contatora,
    gerar_sugestoes_contatoras,
    processar_sugestao_contatora_para_carga,
    reprocessar_contatora_para_carga,
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
from core.choices.eletrica import TipoCorrenteChoices
from core.choices.produtos import UnidadeMedidaChoices


def test_validar_projeto_contatora_exige_campos():
    with pytest.raises(ValidationError, match="tensao_comando"):
        _validar_projeto_contatora(
            SimpleNamespace(tensao_comando=None, tipo_corrente_comando=TipoCorrenteChoices.CC)
        )
    with pytest.raises(ValidationError, match="tipo_corrente_comando"):
        _validar_projeto_contatora(
            SimpleNamespace(tensao_comando=TensaoChoices.V24, tipo_corrente_comando="")
        )


@pytest.mark.django_db
def test_contatora_motor_sem_carga_motor_pendencia(criar_projeto):
    projeto = criar_projeto(nome="CT1", codigo="14101-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
    ).exists()


@pytest.mark.django_db
def test_contatora_sensor_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="CT2", codigo="14102-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) is None


@pytest.mark.django_db
def test_contatora_resistencia_sem_rele_ss_limpa_escopo(criar_projeto):
    projeto = criar_projeto(nome="CT3", codigo="14103-26", tensao_nominal=TensaoChoices.V380)
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
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("1.500"),
    )
    produto = Produto.objects.create(
        codigo="CT-P1",
        descricao="C",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=40,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_selector_vazio_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="CT4", codigo="14104-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_contatora_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_cria_sugestao_com_produto_do_selector(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CT5", codigo="14105-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P5",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = processar_sugestao_contatora_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == produto.id


@pytest.mark.django_db
def test_reprocessar_contatora(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="CT6", codigo="14106-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M6",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P6",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        assert reprocessar_contatora_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_contatoras_remove_anteriores_e_itera(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CT7", codigo="14107-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M7",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P7",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_contatoras(projeto)
    assert len(out) == 1
