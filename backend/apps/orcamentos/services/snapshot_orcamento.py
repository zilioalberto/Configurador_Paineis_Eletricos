"""Snapshot imutável da oferta enviada ao cliente."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from apps.orcamentos.models import (
    Orcamento,
    OrcamentoItem,
    OrcamentoSnapshot,
    TipoItemOrcamentoChoices,
)


def _decimal_str(value: Decimal | None) -> str | None:
    if value is None:
        return None
    return str(value)


def _item_snapshot(item: OrcamentoItem) -> dict:
    subtotal = item.quantidade * item.preco_unitario
    return {
        "id": str(item.id),
        "ordem": item.ordem,
        "tipo": item.tipo,
        "origem": item.origem,
        "configurador_painel": str(item.configurador_painel_id) if item.configurador_painel_id else None,
        "produto": str(item.produto_id) if item.produto_id else None,
        "produto_codigo": item.produto.codigo if item.produto_id else "",
        "produto_descricao": item.produto.descricao if item.produto_id else "",
        "produto_ncm": item.produto.ncm if item.produto_id and item.produto.ncm else "",
        "descricao": item.descricao,
        "quantidade": _decimal_str(item.quantidade),
        "custo_unitario": _decimal_str(item.custo_unitario),
        "margem_percentual": _decimal_str(item.margem_percentual),
        "aliquota_ipi": _decimal_str(item.aliquota_ipi),
        "preco_unitario": _decimal_str(item.preco_unitario),
        "subtotal": _decimal_str(subtotal),
    }


def _dados_snapshot(orcamento: Orcamento) -> dict:
    return {
        "id": str(orcamento.id),
        "codigo": orcamento.codigo,
        "codigo_base": orcamento.codigo_base,
        "revisao": orcamento.revisao,
        "tipo_revisao": orcamento.tipo_revisao,
        "titulo": orcamento.titulo,
        "descricao": orcamento.descricao,
        "cliente": str(orcamento.cliente_id) if orcamento.cliente_id else None,
        "cliente_nome": orcamento.cliente.razao_social if orcamento.cliente_id else orcamento.cliente_referencia,
        "contato_cliente": str(orcamento.contato_cliente_id) if orcamento.contato_cliente_id else None,
        "contato_cliente_nome": orcamento.contato_cliente.nome if orcamento.contato_cliente_id else "",
        "contato_cliente_email": orcamento.contato_cliente.email if orcamento.contato_cliente_id else "",
        "margem_produtos_percentual": _decimal_str(orcamento.margem_produtos_percentual),
        "margem_servicos_percentual": _decimal_str(orcamento.margem_servicos_percentual),
        "status": orcamento.status,
        "valido_ate": orcamento.valido_ate.isoformat() if orcamento.valido_ate else None,
    }


def validar_orcamento_para_snapshot(orcamento: Orcamento) -> list[OrcamentoItem]:
    itens = list(
        orcamento.itens.select_related("produto", "configurador_painel").order_by("ordem", "id")
    )
    if not itens:
        raise ValueError("Inclua ao menos um produto ou serviço antes de enviar a proposta.")

    produtos_sem_custo = [
        str(idx)
        for idx, item in enumerate(itens, start=1)
        if item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.custo_unitario <= 0
    ]
    if produtos_sem_custo:
        raise ValueError(
            "Informe custo maior que zero nos produtos das linhas: "
            f"{', '.join(produtos_sem_custo)}."
        )
    return itens


@transaction.atomic
def criar_snapshot_envio_orcamento(
    orcamento: Orcamento,
    *,
    usuario=None,
) -> OrcamentoSnapshot:
    """Cria o snapshot da revisão se ainda não existir."""

    try:
        return orcamento.snapshot_envio
    except OrcamentoSnapshot.DoesNotExist:
        pass

    if OrcamentoSnapshot.objects.filter(orcamento=orcamento).exists():
        existente = OrcamentoSnapshot.objects.get(orcamento=orcamento)
        return existente

    itens = validar_orcamento_para_snapshot(orcamento)
    itens_json = [_item_snapshot(item) for item in itens]
    total = sum((item.quantidade * item.preco_unitario for item in itens), Decimal("0"))

    return OrcamentoSnapshot.objects.create(
        orcamento=orcamento,
        status_orcamento=orcamento.status,
        codigo=orcamento.codigo,
        dados=_dados_snapshot(orcamento),
        itens=itens_json,
        total=total,
        gerado_por=usuario if getattr(usuario, "is_authenticated", False) else None,
    )
