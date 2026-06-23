"""Testes de conciliação holerites × RH."""
import pytest
from decimal import Decimal

from apps.fiscal.models_obrigacoes import HoleriteCompetencia, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.holerites_rh import (
    conciliar_holerites_rh_pacote,
    criar_colaboradores_holerites_faltantes,
    importar_holerite_item,
    melhor_colaborador_por_nome,
    sugerir_colaborador,
)
from apps.rh.models import Colaborador


@pytest.mark.django_db
def test_sugerir_colaborador_por_nome_sem_espacos():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    colaborador = Colaborador.objects.create(matricula="001", nome="RAFAEL CASAGRANDE", ativo=True)
    holerite = HoleriteCompetencia.objects.create(
        pacote=pacote,
        nome="RAF AEL CAS AGRANDE",
        cpf="",
        proventos=Decimal("3500"),
    )
    assert sugerir_colaborador(holerite) == colaborador


@pytest.mark.django_db
def test_nao_sugere_nome_curto_parcial():
    Colaborador.objects.create(matricula="002", nome="TAIS", ativo=True)
    colaborador_longo = Colaborador.objects.create(
        matricula="003",
        nome="TAIS CLOZATO BEZERRA",
        ativo=True,
    )
    _, score_curto, _ = melhor_colaborador_por_nome("T AIS CLOZA TO BEZERRA")
    _, score_longo, _ = melhor_colaborador_por_nome("T AIS CLOZA TO BEZERRA")
    assert score_longo >= score_curto
    assert melhor_colaborador_por_nome("T AIS CLOZA TO BEZERRA")[0] == colaborador_longo


@pytest.mark.django_db
def test_importar_holerite_sem_colaborador_nao_aplica_valores():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    item = {
        "cpf": "",
        "nome": "COLABORADOR DESCONHECIDO",
        "tipo": "CLT",
        "proventos": "1000.00",
        "desconto_inss": "100.00",
        "base_fgts": "1000.00",
        "fgts_mes": "80.00",
    }
    holerite, info = importar_holerite_item(pacote, item)
    assert info["status"] == "SEM_CADASTRO"
    assert holerite.proventos == Decimal("0")
    assert holerite.desconto_inss == Decimal("0")
    assert holerite.dados_extra["valores_pendentes"]["proventos"] == "1000.00"


@pytest.mark.django_db
def test_importar_holerite_com_colaborador_aplica_valores():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    Colaborador.objects.create(matricula="001", nome="ALBERTO ZILIO", ativo=True)
    item = {
        "cpf": "",
        "nome": "ALBERTO ZILIO",
        "tipo": "CLT",
        "proventos": "1621.00",
        "desconto_inss": "178.31",
        "base_fgts": "0",
        "fgts_mes": "0",
    }
    holerite, info = importar_holerite_item(pacote, item)
    assert info["status"] == "VINCULADO"
    assert holerite.colaborador is not None
    assert holerite.proventos == Decimal("1621.00")
    assert holerite.dados_extra["valores_aplicados"] is True


@pytest.mark.django_db
def test_conciliar_holerites_rh_pacote():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    Colaborador.objects.create(matricula="001", nome="ALBERTO ZILIO", ativo=True)
    importar_holerite_item(
        pacote,
        {
            "cpf": "",
            "nome": "ALBERTO ZILIO",
            "tipo": "CLT",
            "proventos": "1621",
            "desconto_inss": "178.31",
            "base_fgts": "0",
            "fgts_mes": "0",
        },
    )
    importar_holerite_item(
        pacote,
        {
            "cpf": "",
            "nome": "COLABORADOR NOVO",
            "tipo": "CLT",
            "proventos": "1000",
            "desconto_inss": "100",
            "base_fgts": "0",
            "fgts_mes": "0",
        },
    )

    resultado = conciliar_holerites_rh_pacote(pacote)
    assert resultado["total"] == 2
    assert resultado["vinculados"] == 1
    assert resultado["pendentes_count"] == 1


@pytest.mark.django_db
def test_criar_colaboradores_holerites_faltantes():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    holerite, _ = importar_holerite_item(
        pacote,
        {
            "cpf": "12345678901",
            "nome": "SHEILA ZILIO",
            "tipo": "CLT",
            "proventos": "2500",
            "desconto_inss": "275",
            "base_fgts": "0",
            "fgts_mes": "0",
        },
    )

    resultado = criar_colaboradores_holerites_faltantes(pacote)
    assert resultado["criados"] == 1
    holerite.refresh_from_db()
    assert holerite.colaborador_id is not None
    assert holerite.proventos == Decimal("2500")
    assert Colaborador.objects.filter(nome="SHEILA ZILIO").exists()
