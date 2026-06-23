"""Matching em cascata: item de NF-e recebida → Produto do catálogo.

Ordem de tentativa (mais confiável primeiro):
1. GTIN/EAN exato.
2. De-para fornecedor↔produto (CNPJ do emitente + código do fornecedor).
3. Código do produto igual ao código do catálogo (case-insensitive).
4. Similaridade (descrição + código), filtrada por NCM, como *sugestão* a confirmar.

As três primeiras retornam um vínculo confiável; a quarta apenas sugere e pede
confirmação do usuário ("é o mesmo produto?").
"""
from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher

from apps.catalogo.models import Produto
from apps.fiscal.models import ProdutoFornecedorXRef
from apps.fiscal.utils import normalizar_cnpj

LIMIAR_SUGESTAO = 0.72
MAX_SUGESTOES = 5
MAX_CANDIDATOS_VARREDURA = 400


def _norm_texto(valor: str) -> str:
    return " ".join((valor or "").strip().upper().split())


def _norm_codigo(valor: str) -> str:
    return "".join(ch for ch in (valor or "").upper() if ch.isalnum())


def _norm_ncm(valor: str) -> str:
    return "".join(ch for ch in (valor or "") if ch.isdigit())


def _ratio(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


@dataclass
class CandidatoProduto:
    produto_id: str
    codigo: str
    descricao: str
    ncm: str
    gtin: str
    score: float
    motivos: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "produto_id": self.produto_id,
            "codigo": self.codigo,
            "descricao": self.descricao,
            "ncm": self.ncm,
            "gtin": self.gtin,
            "score": round(self.score, 4),
            "motivos": self.motivos,
        }


@dataclass
class ResultadoMatch:
    produto: Produto | None
    metodo: str  # GTIN | DEPARA | CODIGO | SIMILARIDADE | NENHUM
    confianca: str  # ALTA | MEDIA | BAIXA | NENHUMA
    requer_confirmacao: bool
    sugestoes: list[CandidatoProduto] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "produto_id": str(self.produto.id) if self.produto else None,
            "produto_codigo": self.produto.codigo if self.produto else None,
            "produto_descricao": self.produto.descricao if self.produto else None,
            "metodo": self.metodo,
            "confianca": self.confianca,
            "requer_confirmacao": self.requer_confirmacao,
            "sugestoes": [c.to_dict() for c in self.sugestoes],
        }


def _match_gtin(gtin: str) -> Produto | None:
    gtin = (gtin or "").strip()
    if len(gtin) < 8:
        return None
    return Produto.objects.filter(gtin=gtin).first()


def _match_depara(cnpj_fornecedor: str, codigo_fornecedor: str) -> Produto | None:
    cnpj = normalizar_cnpj(cnpj_fornecedor)
    codigo = (codigo_fornecedor or "").strip()
    if len(cnpj) != 14 or not codigo:
        return None
    xref = (
        ProdutoFornecedorXRef.objects.filter(
            cnpj_fornecedor=cnpj,
            codigo_fornecedor__iexact=codigo,
        )
        .select_related("produto")
        .first()
    )
    return xref.produto if xref else None


def _match_codigo(codigo_fornecedor: str) -> Produto | None:
    codigo = (codigo_fornecedor or "").strip()
    if not codigo:
        return None
    return Produto.objects.filter(codigo__iexact=codigo).first()


def _candidatos_por_ncm(ncm: str):
    ncm_norm = _norm_ncm(ncm)
    qs = Produto.objects.all()
    if len(ncm_norm) == 8:
        qs = qs.filter(ncm=ncm_norm)
    return qs.only("id", "codigo", "descricao", "ncm", "gtin")[:MAX_CANDIDATOS_VARREDURA]


def _sugestoes_similaridade(
    *, codigo_fornecedor: str, ncm: str, descricao: str
) -> list[CandidatoProduto]:
    alvo_desc = _norm_texto(descricao)
    alvo_codigo = _norm_codigo(codigo_fornecedor)
    if not alvo_desc and not alvo_codigo:
        return []

    candidatos: list[CandidatoProduto] = []
    for produto in _candidatos_por_ncm(ncm):
        score_desc = _ratio(alvo_desc, _norm_texto(produto.descricao))
        score_codigo = _ratio(alvo_codigo, _norm_codigo(produto.codigo))
        score = max(score_desc, score_codigo)
        motivos: list[str] = []
        if score_desc >= LIMIAR_SUGESTAO:
            motivos.append("descrição semelhante")
        if score_codigo >= LIMIAR_SUGESTAO:
            motivos.append("código semelhante")
        if _norm_ncm(ncm) and _norm_ncm(produto.ncm) == _norm_ncm(ncm):
            motivos.append("mesmo NCM")
            score = min(1.0, score + 0.05)
        if score >= LIMIAR_SUGESTAO:
            candidatos.append(
                CandidatoProduto(
                    produto_id=str(produto.id),
                    codigo=produto.codigo,
                    descricao=produto.descricao,
                    ncm=produto.ncm,
                    gtin=produto.gtin,
                    score=score,
                    motivos=motivos,
                )
            )
    candidatos.sort(key=lambda c: c.score, reverse=True)
    return candidatos[:MAX_SUGESTOES]


def encontrar_produto(
    *,
    cnpj_fornecedor: str = "",
    codigo_fornecedor: str = "",
    gtin: str = "",
    ncm: str = "",
    descricao: str = "",
) -> ResultadoMatch:
    """Executa o matching em cascata e devolve vínculo confiável ou sugestões."""
    produto = _match_gtin(gtin)
    if produto is not None:
        return ResultadoMatch(produto, "GTIN", "ALTA", False)

    produto = _match_depara(cnpj_fornecedor, codigo_fornecedor)
    if produto is not None:
        return ResultadoMatch(produto, "DEPARA", "ALTA", False)

    produto = _match_codigo(codigo_fornecedor)
    if produto is not None:
        return ResultadoMatch(produto, "CODIGO", "ALTA", False)

    sugestoes = _sugestoes_similaridade(
        codigo_fornecedor=codigo_fornecedor,
        ncm=ncm,
        descricao=descricao,
    )
    if sugestoes:
        return ResultadoMatch(None, "SIMILARIDADE", "MEDIA", True, sugestoes)

    return ResultadoMatch(None, "NENHUM", "NENHUMA", False)
