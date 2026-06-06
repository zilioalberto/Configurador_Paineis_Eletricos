"""Endereço do cliente na prévia da oferta."""
import pytest

from apps.cadastros.models import ContatoParceiro, EnderecoParceiro, ParceiroComercial
from apps.orcamentos.models import Orcamento, PerfilOfertaChoices, StatusOrcamentoChoices
from apps.orcamentos.services.formatacao_oferta import cnpj_exibicao, formatar_endereco_parceiro
from apps.orcamentos.services.preview_oferta import montar_preview_oferta


@pytest.mark.django_db
def test_formatar_endereco_parceiro_linha_completa():
    cliente = ParceiroComercial.objects.create(
        documento="12345678000199",
        razao_social="Cliente Endereco LTDA",
        eh_cliente=True,
    )
    endereco = EnderecoParceiro.objects.create(
        parceiro=cliente,
        logradouro="Rua das Flores",
        numero="100",
        complemento="Sala 2",
        bairro="Centro",
        municipio="Joinville",
        uf="SC",
        cep="89200000",
        principal=True,
    )

    assert formatar_endereco_parceiro(endereco) == (
        "Rua das Flores, 100, Sala 2, Centro — Joinville / SC — CEP 89200-000"
    )


@pytest.mark.django_db
def test_preview_oferta_inclui_endereco_principal():
    cliente = ParceiroComercial.objects.create(
        documento="98765432000111",
        razao_social="Aht Cooling Systems LTDA",
        eh_cliente=True,
    )
    EnderecoParceiro.objects.create(
        parceiro=cliente,
        logradouro="RODOVIA BR-101",
        numero="5000",
        bairro="DISTRITO INDUSTRIAL",
        municipio="JOINVILLE",
        uf="sc",
        cep="89219600",
        principal=True,
    )
    contato = ContatoParceiro.objects.create(
        parceiro=cliente,
        nome="Compras",
        email="compras@aht.com",
        principal=True,
    )
    orc = Orcamento.objects.create(
        codigo_base="O-END",
        titulo="Proposta endereço",
        cliente=cliente,
        contato_cliente=contato,
        perfil_oferta=PerfilOfertaChoices.MATERIAIS,
        status=StatusOrcamentoChoices.RASCUNHO,
    )

    preview = montar_preview_oferta(orc)
    assert preview["cliente"]["endereco"] == (
        "Rodovia Br-101, 5000, Distrito Industrial — Joinville / SC — CEP 89219-600"
    )
    assert preview["cliente"]["cnpj"] == cnpj_exibicao("98765432000111")


def test_cnpj_exibicao_mascara():
    assert cnpj_exibicao("98765432000111") == "98.765.432/0001-11"
    assert cnpj_exibicao("") == ""
