import pytest

from apps.configurador_paineis.projetos.models import ProjetoConfigurador


@pytest.mark.django_db
def test_save_gera_codigo_automatico_com_uuid_pre_atribuido(projeto_ca_minimo_kwargs):
    """BaseModel define UUID antes do INSERT; save() não pode usar `pk is None`."""
    projeto = ProjetoConfigurador(
        nome="Painel automático",
        cliente="Cliente teste",
        **projeto_ca_minimo_kwargs,
    )
    assert projeto.pk is not None
    assert not (projeto.codigo or "").strip()

    projeto.save()

    assert projeto.codigo
    assert projeto.codigo == projeto.codigo.upper()
