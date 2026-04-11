from datetime import datetime

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from projetos.models import Projeto
from projetos.services import codigo_projeto as svc


@pytest.mark.django_db
def test_sugerir_proximo_sem_projetos_usa_mes_e_ano():
    fixed = timezone.make_aware(datetime(2026, 4, 10, 12, 0, 0))
    assert svc.sugerir_proximo_codigo_projeto(now=fixed) == "04001-26"


@pytest.mark.django_db
def test_sugerir_proximo_incrementa_sequencial(criar_projeto):
    fixed = timezone.make_aware(datetime(2026, 4, 10, 12, 0, 0))
    criar_projeto(nome="P1", codigo="04001-26")
    criar_projeto(nome="P2", codigo="04002-26")
    assert svc.sugerir_proximo_codigo_projeto(now=fixed) == "04003-26"


@pytest.mark.django_db
def test_sugerir_ignora_codigo_formato_invalido_no_filtro(criar_projeto):
    fixed = timezone.make_aware(datetime(2026, 4, 10, 12, 0, 0))
    criar_projeto(nome="Bad", codigo="INVALID")
    assert svc.sugerir_proximo_codigo_projeto(now=fixed) == "04001-26"


def test_limite_999_projeto_no_mes(monkeypatch):
    monkeypatch.setattr(svc, "_maior_sequencial_para_mes", lambda _m, _y: 999)
    fixed = timezone.make_aware(datetime(2026, 4, 10, 12, 0, 0))
    with pytest.raises(ValidationError) as exc:
        svc.sugerir_proximo_codigo_projeto(now=fixed)
    assert "codigo" in exc.value.error_dict


def test_integrity_error_detecta_codigo_na_mensagem():
    assert svc._integrity_error_duplicidade_codigo_projeto(
        Exception("duplicate key value violates unique constraint projetos_projeto_codigo")
    )


def test_integrity_error_detecta_na_cause():
    inner = Exception("codigo")
    outer = RuntimeError("wrap")
    outer.__cause__ = inner
    assert svc._integrity_error_duplicidade_codigo_projeto(outer)


def test_integrity_error_false_quando_nao_duplicidade():
    assert not svc._integrity_error_duplicidade_codigo_projeto(ValueError("outro"))
