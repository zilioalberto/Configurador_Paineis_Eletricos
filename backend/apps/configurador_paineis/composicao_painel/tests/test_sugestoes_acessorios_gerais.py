from decimal import Decimal

import pytest

from apps.catalogo.models import EspecificacaoAcessorioGeral, Produto
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.acessorios_gerais import (
    gerar_sugestao_acessorios_gerais,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.produtos import (
    PortePainelAcessoriosChoices,
    TipoAcessorioGeralChoices,
    UnidadeMedidaChoices,
)


def _produto(codigo: str, descricao: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=descricao,
        categoria=CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
        unidade_medida=UnidadeMedidaChoices.UN,
    )


def _salvar_mecanica(projeto, *, largura=800, altura=1000):
    return ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "corrente_total_painel_a": Decimal("20.00"),
            "altura_painel_mm": altura,
            "detalhe_dimensionamento_mecanico": {
                "painel_escolhido": {
                    "placa_largura_util_mm": largura,
                    "placa_altura_util_mm": altura,
                    "profundidade_mm": 250,
                },
                "layout_placa": {
                    "largura_placa_mm": largura,
                    "altura_placa_mm": altura,
                    "canaletas_verticais": [],
                    "canaletas_horizontais": [],
                    "trilhos_din": [],
                },
            },
        },
    )


@pytest.mark.django_db
def test_acessorios_gerais_sugere_kit_por_porte_do_painel(criar_projeto):
    projeto = criar_projeto(nome="PGER", codigo="34001-26", tensao_nominal=TensaoChoices.V380)
    _salvar_mecanica(projeto, largura=800, altura=1000)
    produto = _produto("KIT-GERAL-M", "Kit acessórios gerais médio")
    EspecificacaoAcessorioGeral.objects.create(
        produto=produto,
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=PortePainelAcessoriosChoices.MEDIO,
        largura_max_mm=Decimal("1000.00"),
        altura_max_mm=Decimal("1200.00"),
        profundidade_max_mm=Decimal("400.00"),
        quantidade_padrao=Decimal("1.00"),
    )

    sugestoes = gerar_sugestao_acessorios_gerais(projeto)

    assert len(sugestoes) == 1
    sugestao = sugestoes[0]
    assert sugestao.produto_id == produto.id
    assert sugestao.quantidade == Decimal("1.00")
    assert sugestao.parte_painel == PartesPainelChoices.ACESSORIOS
    assert sugestao.categoria_produto == CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS
    assert "Porte calculado: MEDIO" in sugestao.memoria_calculo
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0


@pytest.mark.django_db
def test_acessorios_gerais_sem_catalogo_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="PGER2", codigo="34002-26", tensao_nominal=TensaoChoices.V380)
    _salvar_mecanica(projeto, largura=1200, altura=1400)

    sugestoes = gerar_sugestao_acessorios_gerais(projeto)

    assert sugestoes == []
    pendencia = PendenciaItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
    )
    assert "Nenhum kit de acessórios gerais" in pendencia.descricao
    assert "Porte calculado: EXTRA_GRANDE" in pendencia.memoria_calculo


@pytest.mark.django_db
def test_acessorios_gerais_aguarda_dimensionamento_mecanico_e_limpa_escopo(criar_projeto):
    projeto = criar_projeto(nome="PGER3", codigo="34003-26", tensao_nominal=TensaoChoices.V380)
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={"corrente_total_painel_a": Decimal("20.00"), "altura_painel_mm": 1000},
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
        descricao="Pendência antiga",
        indice_escopo=520,
    )

    sugestoes = gerar_sugestao_acessorios_gerais(projeto)

    assert sugestoes == []
    assert SugestaoItem.objects.filter(projeto=projeto).count() == 0
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0
