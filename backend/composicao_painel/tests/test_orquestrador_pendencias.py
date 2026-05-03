"""Cobre `orquestrador_pendencias.reavaliar_pendencias_projeto`."""

from unittest.mock import patch

import pytest

from cargas.models import Carga
from composicao_painel.models import PendenciaItem
from composicao_painel.services.sugestoes.orquestrador_pendencias import (
    reavaliar_pendencias_projeto,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices


def test_reavaliar_projeto_none_lanca():
    with pytest.raises(ValueError, match="Projeto não informado"):
        reavaliar_pendencias_projeto(None)


@pytest.mark.django_db
def test_reavaliar_contatora_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OP1", codigo="16001-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        descricao="pend",
        ordem=40,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "sem carga" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_soft_starter_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OPSS", codigo="16021-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        descricao="pend",
        ordem=45,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "soft starter" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_inversor_frequencia_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OPIF", codigo="16022-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        descricao="pend",
        ordem=46,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "inversor" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_minidisjuntor_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OPMD", codigo="16020-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "minidisjuntor" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_disjuntor_motor_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OP2", codigo="16002-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "disjuntor motor" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_rele_sobrecarga_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OP7", codigo="16007-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "relé de sobrecarga" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_fusivel_sem_carga_registra_erro(criar_projeto):
    projeto = criar_projeto(nome="OP9", codigo="16009-26", tensao_nominal=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "fusível" in r["erros"][0]["erro"].lower()


@pytest.mark.django_db
def test_reavaliar_contatora_com_carga_chama_reprocessar(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="OP3", codigo="16003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        descricao="pend",
        ordem=40,
        status=StatusPendenciaChoices.ABERTA,
    )
    with patch(
        "composicao_painel.services.sugestoes.orquestrador_pendencias.reprocessar_contatora_para_carga"
    ) as mock_r:
        mock_r.return_value = None
        r = reavaliar_pendencias_projeto(projeto)
    mock_r.assert_called_once_with(projeto, carga)
    assert CategoriaProdutoNomeChoices.CONTATORA in r["categorias_reavaliadas"]
    assert r["pendencias_analisadas"] == 1


@pytest.mark.django_db
def test_reavaliar_rele_sobrecarga_com_carga_chama_reprocessar(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="OP8", codigo="16008-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M8",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    with patch(
        "composicao_painel.services.sugestoes.orquestrador_pendencias.reprocessar_rele_sobrecarga_para_carga"
    ) as mock_r:
        mock_r.return_value = None
        r = reavaliar_pendencias_projeto(projeto)
    mock_r.assert_called_once_with(projeto, carga)
    assert CategoriaProdutoNomeChoices.RELE_SOBRECARGA in r["categorias_reavaliadas"]


@pytest.mark.django_db
def test_reavaliar_fusivel_com_carga_chama_reprocessar(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="OP10", codigo="16010-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M10",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        descricao="pend",
        ordem=30,
        status=StatusPendenciaChoices.ABERTA,
    )
    with patch(
        "composicao_painel.services.sugestoes.orquestrador_pendencias.reprocessar_fusivel_para_carga"
    ) as mock_r:
        mock_r.return_value = None
        r = reavaliar_pendencias_projeto(projeto)
    mock_r.assert_called_once_with(projeto, carga)
    assert CategoriaProdutoNomeChoices.FUSIVEL in r["categorias_reavaliadas"]


@pytest.mark.django_db
def test_reavaliar_seccionamento_chama_reprocessar(criar_projeto):
    projeto = criar_projeto(nome="OP4", codigo="16004-26", tensao_nominal=TensaoChoices.V380)
    pend = PendenciaItem.objects.create(
        projeto=projeto,
        carga=None,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        descricao="pend",
        ordem=10,
        status=StatusPendenciaChoices.ABERTA,
    )
    with patch(
        "composicao_painel.services.sugestoes.orquestrador_pendencias.reprocessar_seccionamento_para_pendencia"
    ) as mock_s:
        mock_s.return_value = None
        r = reavaliar_pendencias_projeto(projeto)
    mock_s.assert_called_once_with(projeto, pend)


@pytest.mark.django_db
def test_reavaliar_parte_nao_mapeada(criar_projeto):
    projeto = criar_projeto(nome="OP5", codigo="16005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="X1",
        descricao="X",
        tipo=TipoCargaChoices.SENSOR,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        descricao="pend",
        ordem=25,
        status=StatusPendenciaChoices.ABERTA,
    )
    r = reavaliar_pendencias_projeto(projeto)
    assert any("MINIDISJUNTOR" in x for x in r["categorias_nao_mapeadas"])


@pytest.mark.django_db
def test_reavaliar_excecao_no_reprocess_vai_para_erros(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="OP6", codigo="16006-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        descricao="pend",
        ordem=40,
        status=StatusPendenciaChoices.ABERTA,
    )
    with patch(
        "composicao_painel.services.sugestoes.orquestrador_pendencias.reprocessar_contatora_para_carga",
        side_effect=RuntimeError("falha simulada"),
    ):
        r = reavaliar_pendencias_projeto(projeto)
    assert len(r["erros"]) == 1
    assert "falha simulada" in r["erros"][0]["erro"]
