import pytest
from django.core.exceptions import ValidationError

from core.choices import TensaoChoices
from projetos.models import Projeto


@pytest.mark.django_db
def test_clean_exige_familia_plc_quando_possui_plc(projeto_ca_minimo_kwargs):
    p = Projeto(
        nome="P",
        codigo="21010-26",
        **projeto_ca_minimo_kwargs,
        tensao_nominal=TensaoChoices.V380,
        possui_plc=True,
        familia_plc=None,
    )
    with pytest.raises(ValidationError) as exc:
        p.full_clean()
    assert "familia_plc" in exc.value.error_dict


@pytest.mark.django_db
def test_save_limpa_familia_plc_quando_nao_possui_plc(criar_projeto):
    p = criar_projeto(
        nome="P",
        codigo="21011-26",
        tensao_nominal=TensaoChoices.V380,
        possui_plc=True,
        familia_plc="S7-1200",
    )
    p.possui_plc = False
    p.save()
    p.refresh_from_db()
    assert p.familia_plc is None
