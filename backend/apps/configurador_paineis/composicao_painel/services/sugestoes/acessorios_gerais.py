"""Sugestão de kit de acessórios gerais a partir do porte do painel."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ObjectDoesNotExist

from apps.catalogo.selectors.acessorios_gerais import selecionar_acessorios_gerais
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.produtos import PortePainelAcessoriosChoices, TipoAcessorioGeralChoices

_ORDEM_ACESSORIOS_GERAIS = 47
_INDICE_KIT_ACESSORIOS_GERAIS = 520


def _limpar_escopo_acessorios_gerais(projeto) -> None:
    filtro = {
        "projeto": projeto,
        "carga__isnull": True,
        "parte_painel": PartesPainelChoices.ACESSORIOS,
        "categoria_produto": CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
    }
    SugestaoItem.objects.filter(**filtro).delete()
    PendenciaItem.objects.filter(**filtro).delete()


def _dimensoes_painel(detalhe: dict) -> tuple[Decimal | None, Decimal | None, Decimal | None]:
    painel = detalhe.get("painel_escolhido") or {}
    layout = detalhe.get("layout_placa") or {}
    largura = painel.get("placa_largura_util_mm") or layout.get("largura_placa_mm")
    altura = painel.get("placa_altura_util_mm") or layout.get("altura_placa_mm")
    profundidade = painel.get("profundidade_mm")
    return (
        Decimal(str(largura)) if largura is not None else None,
        Decimal(str(altura)) if altura is not None else None,
        Decimal(str(profundidade)) if profundidade is not None else None,
    )


def _porte_por_dimensoes(largura_mm: Decimal | None, altura_mm: Decimal | None) -> str:
    if largura_mm is None or altura_mm is None:
        return PortePainelAcessoriosChoices.MEDIO
    maior = max(largura_mm, altura_mm)
    area = largura_mm * altura_mm
    if maior <= Decimal("600") and area <= Decimal("240000"):
        return PortePainelAcessoriosChoices.PEQUENO
    if maior <= Decimal("1000") and area <= Decimal("800000"):
        return PortePainelAcessoriosChoices.MEDIO
    if maior <= Decimal("1600") and area <= Decimal("1600000"):
        return PortePainelAcessoriosChoices.GRANDE
    return PortePainelAcessoriosChoices.EXTRA_GRANDE


def gerar_sugestao_acessorios_gerais(projeto) -> list[SugestaoItem]:
    """Gera um kit de acessórios gerais após o dimensionamento mecânico."""
    print("\n" + "=" * 100)
    print("[ACESSORIOS_GERAIS] Iniciando gerar_sugestao_acessorios_gerais")

    _limpar_escopo_acessorios_gerais(projeto)
    try:
        detalhe = projeto.resumo_dimensionamento.detalhe_dimensionamento_mecanico or {}
    except ObjectDoesNotExist:
        detalhe = {}

    if not detalhe.get("layout_placa"):
        print("[ACESSORIOS_GERAIS] Sem layout_placa salvo; etapa ignorada.")
        return []

    largura_mm, altura_mm, profundidade_mm = _dimensoes_painel(detalhe)
    porte = _porte_por_dimensoes(largura_mm, altura_mm)
    produto = selecionar_acessorios_gerais(
        tipo_acessorio=TipoAcessorioGeralChoices.KIT_MONTAGEM,
        porte_painel=porte,
        largura_mm=largura_mm,
        altura_mm=altura_mm,
        profundidade_mm=profundidade_mm,
    ).first()
    spec = getattr(produto, "especificacao_acessorio_geral", None) if produto else None
    quantidade = spec.quantidade_padrao if spec is not None else Decimal("1.00")
    memoria = (
        "[ACESSORIOS GERAIS]\n"
        f"Porte calculado: {porte}\n"
        f"Largura referência: {largura_mm or 'não informada'} mm\n"
        f"Altura referência: {altura_mm or 'não informada'} mm\n"
        f"Profundidade referência: {profundidade_mm or 'não informada'} mm\n"
        f"Tipo acessório: {TipoAcessorioGeralChoices.KIT_MONTAGEM}\n"
        f"Quantidade sugerida: {quantidade}\n"
        "Critério v1: kit de montagem por porte/faixa do painel após dimensionamento mecânico.\n"
    )
    filtro = {
        "projeto": projeto,
        "carga": None,
        "parte_painel": PartesPainelChoices.ACESSORIOS,
        "categoria_produto": CategoriaProdutoNomeChoices.ACESSORIOS_GERAIS,
        "indice_escopo": _INDICE_KIT_ACESSORIOS_GERAIS,
    }
    if produto is None:
        PendenciaItem.objects.update_or_create(
            **filtro,
            defaults={
                "descricao": (
                    "Nenhum kit de acessórios gerais cadastrado para painel "
                    f"porte {porte} com dimensões {largura_mm or '-'} x {altura_mm or '-'} mm."
                ),
                "corrente_referencia_a": None,
                "memoria_calculo": memoria,
                "observacoes": "",
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": _ORDEM_ACESSORIOS_GERAIS,
            },
        )
        return []

    PendenciaItem.objects.filter(**filtro).delete()
    sugestao, _ = SugestaoItem.objects.update_or_create(
        **filtro,
        defaults={
            "produto": produto,
            "quantidade": quantidade,
            "corrente_referencia_a": None,
            "memoria_calculo": memoria,
            "observacoes": "",
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": _ORDEM_ACESSORIOS_GERAIS,
        },
    )
    print(f"[ACESSORIOS_GERAIS] Total sugestões: 1 | projeto={projeto.id}")
    print("=" * 100 + "\n")
    return [sugestao]
