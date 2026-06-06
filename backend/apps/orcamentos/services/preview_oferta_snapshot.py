"""Prévia da oferta a partir do snapshot congelado (link público)."""
from __future__ import annotations

from decimal import Decimal

from django.utils import timezone

from apps.orcamentos.models import OrcamentoSnapshot, TipoBlocoOfertaChoices
from apps.orcamentos.services.formatacao_oferta import formatar_conteudo_lista_oferta
from apps.orcamentos.services.oferta_secoes import filtrar_blocos_para_preview
from apps.orcamentos.services.oferta_termos_legais import (
    TERMOS_LEGAIS_VERSAO,
    termos_legais_padrao,
)
from apps.orcamentos.services.totais_oferta import calcular_resumo_financeiro_snapshot_itens


def _investimento_snapshot(dados: dict, itens_json: list) -> dict:
    perfil = dados.get("perfil_oferta") or "MATERIAIS"
    ncm = (dados.get("ncm_investimento") or "").strip()
    linhas = []
    for item in itens_json:
        linhas.append(
            {
                "id": item.get("id"),
                "ordem": item.get("ordem"),
                "tipo": item.get("tipo"),
                "codigo": item.get("produto_codigo") or item.get("servico_codigo") or "",
                "descricao": item.get("descricao") or "",
                "quantidade": item.get("quantidade") or "1",
                "preco_unitario": item.get("preco_unitario") or "0",
                "subtotal": item.get("subtotal") or "0",
                "unidade": item.get("servico_unidade_medida") or "",
                "ncm": item.get("produto_ncm") or (ncm if perfil == "SOLUCAO_COMPLETA" else ""),
            }
        )
    return {"modo": "ITENS_UNITARIOS", "titulo": "Investimento", "itens": linhas}


def _conteudo_bloco_preview(tipo: str, conteudo: str) -> str:
    if tipo in (
        TipoBlocoOfertaChoices.ITENS_FORNECIMENTO,
        TipoBlocoOfertaChoices.SERVICOS,
    ):
        return formatar_conteudo_lista_oferta(conteudo)
    return conteudo


def montar_preview_oferta_snapshot(snapshot: OrcamentoSnapshot) -> dict:
    dados = snapshot.dados or {}
    itens_json = snapshot.itens or []
    blocos_raw = dados.get("oferta_blocos") or []
    secoes = [
        {
            "tipo": b.get("tipo", ""),
            "titulo": b.get("titulo", ""),
            "conteudo": _conteudo_bloco_preview(
                b.get("tipo", ""),
                b.get("conteudo", ""),
            ),
        }
        for b in blocos_raw
        if (b.get("titulo") or "").strip() or (b.get("conteudo") or "").strip()
    ]
    desconto_ativo = bool(dados.get("desconto_comercial_ativo"))
    desconto_pct = Decimal(str(dados.get("desconto_percentual") or "0"))
    totais = calcular_resumo_financeiro_snapshot_itens(
        itens_json,
        desconto_ativo=desconto_ativo,
        desconto_percentual=desconto_pct,
    )
    investimento = _investimento_snapshot(dados, itens_json)
    validade = dados.get("valido_ate")
    return {
        "codigo": snapshot.codigo,
        "codigo_base": (dados.get("codigo_base") or "").strip()
        or (snapshot.codigo or "").split(" Rev ", 1)[0].strip(),
        "revisao": dados.get("revisao") or "",
        "titulo": dados.get("titulo") or "",
        "perfil_oferta": dados.get("perfil_oferta") or "MATERIAIS",
        "emissao": timezone.localdate().isoformat(),
        "cliente": {
            "id": dados.get("cliente"),
            "nome": dados.get("cliente_nome") or "",
            "contato": dados.get("contato_cliente_nome") or "",
            "email": dados.get("contato_cliente_email") or "",
            "telefone": "",
            "endereco": "",
            "cnpj": "",
        },
        "validade": validade,
        "secoes": filtrar_blocos_para_preview(secoes),
        "investimento": investimento,
        "totais": totais,
        "apendice_legal": {
            "versao": TERMOS_LEGAIS_VERSAO,
            "secoes": termos_legais_padrao(),
        },
        "snapshot_id": str(snapshot.id),
        "status_proposta": dados.get("status") or snapshot.status_orcamento,
    }
