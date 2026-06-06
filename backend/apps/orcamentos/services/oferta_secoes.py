"""Seções textuais da oferta alinhadas ao template DOCX (docxtpl)."""
from __future__ import annotations

from apps.orcamentos.models import PerfilOfertaChoices, TipoBlocoOfertaChoices

# Tipos que não devem ser editados como texto (tabela de itens ou layout fixo no Word).
TIPOS_BLOCO_EXCLUIDOS_TEXTO = frozenset(
    {
        TipoBlocoOfertaChoices.INVESTIMENTO,
        TipoBlocoOfertaChoices.APROVACAO,
    }
)

SECOES_TEMPLATE_SOLUCAO_COMPLETA: tuple[str, ...] = (
    TipoBlocoOfertaChoices.INTRODUCAO,
    TipoBlocoOfertaChoices.ESCOPO,
    TipoBlocoOfertaChoices.ITENS_FORNECIMENTO,
    TipoBlocoOfertaChoices.SERVICOS,
    TipoBlocoOfertaChoices.EXCLUSOES,
    TipoBlocoOfertaChoices.PRAZO_ENTREGA,
    TipoBlocoOfertaChoices.CONDICOES_PAGAMENTO,
    TipoBlocoOfertaChoices.CONDICOES_GERAIS,
    TipoBlocoOfertaChoices.GARANTIA,
    TipoBlocoOfertaChoices.OBSERVACOES,
)

SECOES_TEMPLATE_MATERIAIS: tuple[str, ...] = (
    TipoBlocoOfertaChoices.INTRODUCAO,
    TipoBlocoOfertaChoices.PRAZO_ENTREGA,
    TipoBlocoOfertaChoices.CONDICOES_PAGAMENTO,
    TipoBlocoOfertaChoices.CONDICOES_GERAIS,
    TipoBlocoOfertaChoices.GARANTIA,
    TipoBlocoOfertaChoices.OBSERVACOES,
)

TITULOS_PADRAO_POR_TIPO: dict[str, str] = {
    TipoBlocoOfertaChoices.INTRODUCAO: "Apresentação",
    TipoBlocoOfertaChoices.ESCOPO: "Escopo de fornecimento",
    TipoBlocoOfertaChoices.ITENS_FORNECIMENTO: "Itens considerados",
    TipoBlocoOfertaChoices.SERVICOS: "Serviços considerados",
    TipoBlocoOfertaChoices.EXCLUSOES: "Exclusões",
    TipoBlocoOfertaChoices.PRAZO_ENTREGA: "Prazo de entrega",
    TipoBlocoOfertaChoices.CONDICOES_PAGAMENTO: "Condições de pagamento",
    TipoBlocoOfertaChoices.CONDICOES_GERAIS: "Condições gerais",
    TipoBlocoOfertaChoices.GARANTIA: "Garantia",
    TipoBlocoOfertaChoices.OBSERVACOES: "Observações",
}


def secoes_para_perfil(perfil: str | None) -> tuple[str, ...]:
    if perfil == PerfilOfertaChoices.SOLUCAO_COMPLETA:
        return SECOES_TEMPLATE_SOLUCAO_COMPLETA
    return SECOES_TEMPLATE_MATERIAIS


def titulo_padrao_secao(tipo: str) -> str:
    return TITULOS_PADRAO_POR_TIPO.get(tipo, tipo.replace("_", " ").title())


def filtrar_blocos_para_preview(blocos: list[dict]) -> list[dict]:
    """Remove blocos que não entram na prévia textual (investimento = tabela)."""
    return [b for b in blocos if b.get("tipo") not in TIPOS_BLOCO_EXCLUIDOS_TEXTO]
