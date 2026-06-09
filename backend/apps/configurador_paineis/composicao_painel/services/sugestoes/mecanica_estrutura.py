"""Sugestões de canaletas e trilhos DIN a partir do dimensionamento mecânico."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist

from apps.catalogo.models import Produto
from apps.catalogo.selectors.trilhos_din import selecionar_trilhos_din
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.produtos import TipoTrilhoDINChoices

_ORDEM_MECANICA_ESTRUTURA = 46
_INDICE_CANALETA_DIMENSIONADA = 500
_INDICE_TRILHO_DIN_DIMENSIONADO = 510


def _decimal_metros(total_mm: Decimal) -> Decimal:
    return (total_mm / Decimal("1000")).quantize(Decimal("0.01"))


def _total_comprimento_mm(itens: list[dict]) -> Decimal:
    total = Decimal("0")
    for item in itens:
        comprimento = item.get("comprimento_mm")
        if comprimento is None:
            continue
        total += Decimal(str(comprimento))
    return total


def _limpar_escopo_mecanica_estrutura(projeto) -> None:
    for parte, categoria in (
        (PartesPainelChoices.CANALETAS, CategoriaProdutoNomeChoices.CANALETA),
        (PartesPainelChoices.ESTRUTURA, CategoriaProdutoNomeChoices.TRILHO_DIN),
    ):
        SugestaoItem.objects.filter(
            projeto=projeto,
            carga__isnull=True,
            parte_painel=parte,
            categoria_produto=categoria,
        ).delete()
        PendenciaItem.objects.filter(
            projeto=projeto,
            carga__isnull=True,
            parte_painel=parte,
            categoria_produto=categoria,
        ).delete()


def _salvar_ou_pendenciar(
    projeto,
    *,
    parte_painel,
    categoria_produto,
    produto,
    quantidade: Decimal,
    indice_escopo: int,
    descricao_pendencia: str,
    memoria_calculo: str,
) -> SugestaoItem | None:
    filtro = {
        "projeto": projeto,
        "carga": None,
        "parte_painel": parte_painel,
        "categoria_produto": categoria_produto,
        "indice_escopo": indice_escopo,
    }
    if produto is None:
        SugestaoItem.objects.filter(**filtro).delete()
        PendenciaItem.objects.update_or_create(
            **filtro,
            defaults={
                "descricao": descricao_pendencia,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "observacoes": "",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": _ORDEM_MECANICA_ESTRUTURA,
            },
        )
        return None

    PendenciaItem.objects.filter(**filtro).delete()
    sugestao, _ = SugestaoItem.objects.update_or_create(
        **filtro,
        defaults={
            "produto": produto,
            "quantidade": quantidade,
            "corrente_referencia_a": None,
            "memoria_calculo": memoria_calculo,
            "observacoes": "",
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": _ORDEM_MECANICA_ESTRUTURA,
        },
    )
    return sugestao


def _produto_canaleta(detalhe: dict) -> Produto | None:
    canaleta = detalhe.get("canaleta_escolhida") or detalhe.get("canaleta") or {}
    produto_id = canaleta.get("produto_id")
    if not produto_id:
        return None
    return Produto.objects.filter(
        id=produto_id,
        ativo=True,
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    ).first()


def _gerar_canaletas(projeto, detalhe: dict) -> SugestaoItem | None:
    layout = detalhe.get("layout_placa") or {}
    verticais = layout.get("canaletas_verticais") or []
    horizontais = layout.get("canaletas_horizontais") or []
    total_vertical_mm = _total_comprimento_mm(verticais)
    total_horizontal_mm = _total_comprimento_mm(horizontais)
    total_mm = total_vertical_mm + total_horizontal_mm
    if total_mm <= 0:
        return None

    quantidade_m = _decimal_metros(total_mm)
    produto = _produto_canaleta(detalhe)
    memoria = (
        "[MECANICA - CANALETAS]\n"
        f"Canaletas verticais: {len(verticais)} | total {total_vertical_mm} mm\n"
        f"Canaletas horizontais: {len(horizontais)} | total {total_horizontal_mm} mm\n"
        f"Comprimento total: {total_mm} mm\n"
        f"Quantidade sugerida: {quantidade_m} m\n"
        "Origem: layout_placa do dimensionamento mecânico.\n"
    )
    return _salvar_ou_pendenciar(
        projeto,
        parte_painel=PartesPainelChoices.CANALETAS,
        categoria_produto=CategoriaProdutoNomeChoices.CANALETA,
        produto=produto,
        quantidade=quantidade_m,
        indice_escopo=_INDICE_CANALETA_DIMENSIONADA,
        descricao_pendencia=(
            "Dimensionamento mecânico calculou canaletas, mas nenhuma canaleta "
            "válida está vinculada ao catálogo."
        ),
        memoria_calculo=memoria,
    )


def _gerar_trilhos_din(projeto, detalhe: dict) -> SugestaoItem | None:
    layout = detalhe.get("layout_placa") or {}
    trilhos = layout.get("trilhos_din") or []
    total_mm = _total_comprimento_mm(trilhos)
    if total_mm <= 0:
        return None

    quantidade_m = _decimal_metros(total_mm)
    produto = selecionar_trilhos_din(tipo_trilho=TipoTrilhoDINChoices.TS35).first()
    memoria = (
        "[MECANICA - TRILHOS DIN]\n"
        f"Trilhos DIN: {len(trilhos)}\n"
        f"Comprimento total: {total_mm} mm\n"
        f"Quantidade sugerida: {quantidade_m} m\n"
        "Origem: layout_placa do dimensionamento mecânico.\n"
    )
    return _salvar_ou_pendenciar(
        projeto,
        parte_painel=PartesPainelChoices.ESTRUTURA,
        categoria_produto=CategoriaProdutoNomeChoices.TRILHO_DIN,
        produto=produto,
        quantidade=quantidade_m,
        indice_escopo=_INDICE_TRILHO_DIN_DIMENSIONADO,
        descricao_pendencia=(
            "Dimensionamento mecânico calculou trilhos DIN, mas não há trilho DIN "
            "TS35 ativo no catálogo."
        ),
        memoria_calculo=memoria,
    )


def gerar_sugestoes_mecanica_estrutura(projeto) -> list[SugestaoItem]:
    """Gera canaletas e trilhos DIN a partir do dimensionamento mecânico salvo."""
    print("\n" + "=" * 100)
    print("[MECANICA_ESTRUTURA] Iniciando gerar_sugestoes_mecanica_estrutura")

    _limpar_escopo_mecanica_estrutura(projeto)
    try:
        detalhe = projeto.resumo_dimensionamento.detalhe_dimensionamento_mecanico or {}
    except ObjectDoesNotExist:
        detalhe = {}

    if not detalhe.get("layout_placa"):
        print("[MECANICA_ESTRUTURA] Sem layout_placa salvo; etapa ignorada.")
        return []

    sugestoes = [
        sugestao
        for sugestao in (
            _gerar_canaletas(projeto, detalhe),
            _gerar_trilhos_din(projeto, detalhe),
        )
        if sugestao is not None
    ]
    print(
        f"[MECANICA_ESTRUTURA] Total sugestões: {len(sugestoes)} | projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
