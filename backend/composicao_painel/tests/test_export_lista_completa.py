"""Testes unitários para export_lista_completa (Sonar — linhas não cobertas)."""

from decimal import Decimal

import pytest

from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import (
    ComposicaoInclusaoManual,
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)
from composicao_painel.services.export_lista_completa import (
    COLUNAS,
    nome_arquivo_seguro,
    montar_linhas_export,
    render_pdf_bytes,
    render_xlsx_bytes,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_montar_linhas_export_projeto_vazio(criar_projeto):
    projeto = criar_projeto(nome="Z", codigo="09901-26", tensao_nominal=TensaoChoices.V380)
    header, linhas = montar_linhas_export(projeto)
    assert header == COLUNAS
    assert linhas == []


@pytest.mark.django_db
def test_montar_linhas_sem_memoria_calculo_remove_coluna(criar_projeto):
    projeto = criar_projeto(nome="Z", codigo="09902-26", tensao_nominal=TensaoChoices.V380)
    header, linhas = montar_linhas_export(projeto, incluir_memoria_calculo=False)
    assert "Memória de cálculo" not in header
    assert len(header) == len(COLUNAS) - 1


@pytest.mark.django_db
def test_montar_linhas_com_composicao_e_status_marker(criar_projeto):
    projeto = criar_projeto(nome="C", codigo="09903-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="EXP-1",
        descricao="Prod",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="T1",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("1"),
        ordem=1,
        observacoes="[STATUS_APROVACAO] Sugerido pelo sistema",
    )

    header, linhas = montar_linhas_export(projeto)
    assert len(linhas) == 1
    row = linhas[0]
    status_col = header.index("Status")
    assert "Sugerido" in row[status_col]


@pytest.mark.django_db
def test_nome_arquivo_seguro_remove_caracteres_invalidos(criar_projeto):
    projeto = criar_projeto(
        nome='Nome com <> chars',
        codigo="09904-26",
        tensao_nominal=TensaoChoices.V380,
        cliente='Cliente:" X',
    )
    fn = nome_arquivo_seguro(projeto, "xlsx")
    assert "<" not in fn and ">" not in fn and ":" not in fn
    assert fn.endswith(".xlsx")


@pytest.mark.django_db
def test_montar_linhas_sugestao_pendencia_e_inclusao(criar_projeto):
    projeto = criar_projeto(nome="Mix", codigo="09910-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="EXP-MIX",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=1,
        status=StatusSugestaoChoices.PENDENTE,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        descricao="Falta produto",
        ordem=2,
        status=StatusPendenciaChoices.ABERTA,
    )
    ComposicaoInclusaoManual.objects.create(
        projeto=projeto,
        produto=produto,
        quantidade=Decimal("2"),
        observacoes="extra",
        ordem=3,
    )

    header, linhas = montar_linhas_export(projeto)
    assert len(linhas) == 3
    origens = {row[0] for row in linhas}
    assert "Sugestão de item" in origens
    assert "Pendência (catálogo)" in origens
    assert "Inclusão manual (catálogo)" in origens


@pytest.mark.django_db
def test_render_xlsx_e_pdf_bytes(criar_projeto):
    projeto = criar_projeto(nome="R", codigo="09911-26", tensao_nominal=TensaoChoices.V380)
    header, linhas = montar_linhas_export(projeto)
    xlsx = render_xlsx_bytes(projeto, header, linhas)
    assert isinstance(xlsx, bytes) and len(xlsx) > 100
    pdf = render_pdf_bytes(projeto, header, linhas)
    assert pdf.startswith(b"%PDF")

