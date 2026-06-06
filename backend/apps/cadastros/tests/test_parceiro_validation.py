"""Testes de validação e sanitização de parceiros."""

import pytest
from rest_framework import serializers

from apps.cadastros.models import TipoPessoaParceiroChoices
from apps.cadastros.validation.parceiro import (
    normalizar_documento_parceiro,
    sanitizar_attrs_contato,
    sanitizar_attrs_endereco,
    sanitizar_attrs_parceiro,
)
from core.validators.documentos import DocumentoInvalidoError


@pytest.mark.parametrize(
    "tipo,documento,esperado",
    [
        (TipoPessoaParceiroChoices.PESSOA_JURIDICA, "11.444.777/0001-61", "11444777000161"),
        (TipoPessoaParceiroChoices.PESSOA_FISICA, "529.982.247-25", "52998224725"),
    ],
)
def test_normalizar_documento_parceiro_valido(tipo, documento, esperado):
    assert normalizar_documento_parceiro(tipo, documento) == esperado


def test_normalizar_documento_parceiro_vazio():
    with pytest.raises(serializers.ValidationError):
        normalizar_documento_parceiro(TipoPessoaParceiroChoices.PESSOA_JURIDICA, "")


def test_normalizar_documento_cnpj_invalido():
    with pytest.raises(serializers.ValidationError):
        normalizar_documento_parceiro(
            TipoPessoaParceiroChoices.PESSOA_JURIDICA, "00000000000000"
        )


def test_sanitizar_attrs_parceiro_e_endereco():
    parceiro = sanitizar_attrs_parceiro(
        {
            "razao_social": "  Empresa  ",
            "email": "  A@B.COM ",
            "telefone": " 41999999999 ",
            "cnae_fiscal": "6201-5/00",
        }
    )
    assert parceiro["razao_social"] == "Empresa"
    assert parceiro["email"] == "a@b.com"
    assert parceiro["cnae_fiscal"] == "6201500"

    endereco = sanitizar_attrs_endereco(
        {
            "logradouro": "  Rua A  ",
            "municipio": " Curitiba ",
            "uf": "pr",
            "cep": "80000-000",
        }
    )
    assert endereco["logradouro"] == "Rua A"
    assert endereco["uf"] == "PR"
    assert endereco["cep"] == "80000000"


def test_sanitizar_attrs_contato():
    contato = sanitizar_attrs_contato(
        {"nome": "  Joao  ", "email": " JOAO@X.COM ", "telefone": " 41 99999 "}
    )
    assert contato["nome"] == "Joao"
    assert contato["email"] == "joao@x.com"
