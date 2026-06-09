from decimal import Decimal

import pytest

from apps.catalogo.models import EspecificacaoCanaleta, EspecificacaoTrilhoDIN, Produto
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.mecanica_estrutura import (
    gerar_sugestoes_mecanica_estrutura,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices
from core.choices.produtos import (
    MaterialTrilhoDINChoices,
    ModoMontagemChoices,
    TipoTrilhoDINChoices,
    UnidadeMedidaChoices,
)


def _produto(codigo: str, categoria: str, descricao: str) -> Produto:
    return Produto.objects.create(
        codigo=codigo,
        descricao=descricao,
        categoria=categoria,
        unidade_medida=UnidadeMedidaChoices.MT,
    )


@pytest.mark.django_db
def test_mecanica_estrutura_gera_canaletas_e_trilhos_do_layout(criar_projeto):
    projeto = criar_projeto(nome="PMEC", codigo="34001-26")
    canaleta = _produto("CAN-50", CategoriaProdutoNomeChoices.CANALETA, "Canaleta 50")
    EspecificacaoCanaleta.objects.create(
        produto=canaleta,
        largura_base_mm=Decimal("50"),
        altura_mm=Decimal("50"),
        comprimento_mm=Decimal("2000"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    trilho = _produto("TR-DIN", CategoriaProdutoNomeChoices.TRILHO_DIN, "Trilho DIN")
    EspecificacaoTrilhoDIN.objects.create(
        produto=trilho,
        tipo_trilho=TipoTrilhoDINChoices.TS35,
        comprimento_mm=2000,
        material=MaterialTrilhoDINChoices.ACO_GALVANIZADO,
    )
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "detalhe_dimensionamento_mecanico": {
                "canaleta": {
                    "produto_id": str(canaleta.id),
                    "produto_codigo": canaleta.codigo,
                },
                "layout_placa": {
                    "canaletas_verticais": [
                        {"comprimento_mm": 900},
                        {"comprimento_mm": 900},
                    ],
                    "canaletas_horizontais": [
                        {"comprimento_mm": 500},
                        {"comprimento_mm": 500},
                        {"comprimento_mm": 500},
                    ],
                    "trilhos_din": [
                        {"comprimento_mm": 400},
                        {"comprimento_mm": 400},
                    ],
                },
            },
        },
    )

    sugestoes = gerar_sugestoes_mecanica_estrutura(projeto)

    assert len(sugestoes) == 2
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0
    sug_canaleta = SugestaoItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.CANALETA,
        indice_escopo=500,
    )
    assert sug_canaleta.parte_painel == PartesPainelChoices.CANALETAS
    assert sug_canaleta.produto_id == canaleta.id
    assert sug_canaleta.quantidade == Decimal("3.30")
    assert "Canaletas verticais: 2" in sug_canaleta.memoria_calculo
    assert "Canaletas horizontais: 3" in sug_canaleta.memoria_calculo

    sug_trilho = SugestaoItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.TRILHO_DIN,
        indice_escopo=510,
    )
    assert sug_trilho.parte_painel == PartesPainelChoices.ESTRUTURA
    assert sug_trilho.produto_id == trilho.id
    assert sug_trilho.quantidade == Decimal("0.80")


@pytest.mark.django_db
def test_mecanica_estrutura_sem_layout_nao_gera_itens(criar_projeto):
    projeto = criar_projeto(nome="PMEC2", codigo="34002-26")
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={"detalhe_dimensionamento_mecanico": {}},
    )

    sugestoes = gerar_sugestoes_mecanica_estrutura(projeto)

    assert sugestoes == []
    assert SugestaoItem.objects.filter(projeto=projeto).count() == 0
    assert PendenciaItem.objects.filter(projeto=projeto).count() == 0


@pytest.mark.django_db
def test_mecanica_estrutura_sem_trilho_catalogo_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="PMEC3", codigo="34003-26")
    canaleta = _produto("CAN-40", CategoriaProdutoNomeChoices.CANALETA, "Canaleta 40")
    EspecificacaoCanaleta.objects.create(
        produto=canaleta,
        largura_base_mm=Decimal("40"),
        altura_mm=Decimal("40"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    ResumoDimensionamento.objects.update_or_create(
        projeto=projeto,
        defaults={
            "detalhe_dimensionamento_mecanico": {
                "canaleta": {"produto_id": str(canaleta.id)},
                "layout_placa": {
                    "canaletas_verticais": [{"comprimento_mm": 500}],
                    "canaletas_horizontais": [],
                    "trilhos_din": [{"comprimento_mm": 300}],
                },
            },
        },
    )

    sugestoes = gerar_sugestoes_mecanica_estrutura(projeto)

    assert len(sugestoes) == 1
    assert sugestoes[0].categoria_produto == CategoriaProdutoNomeChoices.CANALETA
    pendencia = PendenciaItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.TRILHO_DIN,
    )
    assert "trilho DIN" in pendencia.descricao
