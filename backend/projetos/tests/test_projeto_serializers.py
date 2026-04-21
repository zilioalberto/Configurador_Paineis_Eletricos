import pytest
from rest_framework import serializers

from django.contrib.auth import get_user_model

from projetos.api.serializers import ProjetoEventoSerializer, ProjetoSerializer
from projetos.models import Projeto, ProjetoEvento


def test_validate_codigo_normaliza_e_valida():
    ser = ProjetoSerializer()
    assert ser.validate_codigo(" 04010-26 ") == "04010-26"


def test_validate_codigo_vazio_retorna_valor():
    ser = ProjetoSerializer()
    assert ser.validate_codigo("") == ""


def test_validate_codigo_none():
    ser = ProjetoSerializer()
    assert ser.validate_codigo(None) is None


def test_validate_codigo_formato_invalido():
    ser = ProjetoSerializer()
    with pytest.raises(serializers.ValidationError):
        ser.validate_codigo("ABC")


@pytest.mark.django_db
def test_validate_codigo_duplicado_em_edicao(criar_projeto):
    p1 = criar_projeto(nome="A", codigo="05001-26")
    criar_projeto(nome="B", codigo="05002-26")
    ser = ProjetoSerializer(instance=p1)
    with pytest.raises(serializers.ValidationError, match="já está em uso"):
        ser.validate_codigo("05002-26")


@pytest.mark.django_db
def test_serializer_init_torna_codigo_read_only_com_instance(criar_projeto):
    p = criar_projeto(nome="C", codigo="06001-26")
    ser = ProjetoSerializer(instance=p)
    assert ser.fields["codigo"].read_only is True


@pytest.mark.django_db
def test_serializer_init_codigo_editavel_em_criacao():
    ser = ProjetoSerializer()
    assert ser.fields["codigo"].read_only is False


@pytest.mark.django_db
def test_projeto_evento_serializer_usuario_nome_e_model_str(criar_projeto):
    User = get_user_model()
    user = User.objects.create_user(
        email="evento-serializer@test.com",
        password="evento-serializer-12345",
        is_active=True,
    )
    projeto = criar_projeto(nome="Evento", codigo="06002-26")
    evento = ProjetoEvento.objects.create(
        projeto=projeto,
        usuario=user,
        modulo="projeto",
        acao="editado",
        descricao="Projeto atualizado",
        detalhes={"x": 1},
    )
    data = ProjetoEventoSerializer(evento).data
    assert "usuario_nome" in data
    assert data["descricao"] == "Projeto atualizado"
    assert str(projeto.id) in str(evento)
