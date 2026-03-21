from __future__ import annotations

from decimal import Decimal
from typing import Optional

from django.db import transaction

from composicao_painel.models import SugestaoItem
from composicao_painel.services.conjuntos import obter_ou_criar_conjunto_por_nome

from core.choices.gerais import StatusSugestao

def normalizar_decimal(valor, default: str = "1.000") -> Decimal:
    """
    Converte valor em Decimal de forma segura.
    """
    if valor is None or valor == "":
        return Decimal(default)

    if isinstance(valor, Decimal):
        return valor

    return Decimal(str(valor))


def existe_sugestao_equivalente(
    *,
    projeto,
    conjunto,
    produto=None,
    carga=None,
    tipo_sugestao: str,
    descricao: str = "",
) -> bool:
    """
    Verifica se já existe sugestão pendente equivalente.
    """
    queryset = SugestaoItem.objects.filter(
        projeto=projeto,
        conjunto=conjunto,
        tipo_sugestao=tipo_sugestao,
        status=StatusSugestao.PENDENTE,
    )

    if produto:
        queryset = queryset.filter(produto=produto)
    else:
        queryset = queryset.filter(produto__isnull=True)

    if carga:
        queryset = queryset.filter(carga=carga)
    else:
        queryset = queryset.filter(carga__isnull=True)

    if descricao:
        queryset = queryset.filter(descricao=descricao)

    return queryset.exists()


@transaction.atomic
def limpar_sugestoes_pendentes(
    projeto,
    *,
    tipo_sugestao: Optional[str] = None,
    carga=None,
    conjunto=None,
) -> int:
    """
    Remove sugestões pendentes de acordo com os filtros informados.
    Usar antes de regerar um bloco específico.
    """
    queryset = SugestaoItem.objects.filter(
        projeto=projeto,
        status=StatusSugestao.PENDENTE,
    )

    if tipo_sugestao:
        queryset = queryset.filter(tipo_sugestao=tipo_sugestao)

    if carga:
        queryset = queryset.filter(carga=carga)

    if conjunto:
        queryset = queryset.filter(conjunto=conjunto)

    total = queryset.count()
    queryset.delete()
    return total


@transaction.atomic
def criar_sugestao_item(
    *,
    projeto,
    nome_conjunto: str,
    tipo_sugestao: str,
    descricao: str,
    produto=None,
    carga=None,
    justificativa: str = "",
    quantidade=Decimal("1.000"),
    unidade: str = "",
    observacoes: str = "",
    ordem_conjunto: Optional[int] = None,
) -> SugestaoItem:
    """
    Cria uma sugestão de item de forma padronizada.
    """
    conjunto = obter_ou_criar_conjunto_por_nome(
        projeto=projeto,
        nome_conjunto=nome_conjunto,
    )

    if ordem_conjunto and conjunto.ordem != ordem_conjunto:
        conjunto.ordem = ordem_conjunto
        conjunto.save(update_fields=["ordem", "atualizado_em"])

    if existe_sugestao_equivalente(
        projeto=projeto,
        conjunto=conjunto,
        produto=produto,
        carga=carga,
        tipo_sugestao=tipo_sugestao,
        descricao=descricao,
    ):
        return SugestaoItem.objects.filter(
            projeto=projeto,
            conjunto=conjunto,
            produto=produto,
            carga=carga,
            tipo_sugestao=tipo_sugestao,
            descricao=descricao,
            status=StatusSugestao.PENDENTE,
        ).first()

    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        conjunto=conjunto,
        produto=produto,
        carga=carga,
        tipo_sugestao=tipo_sugestao,
        descricao=descricao,
        justificativa=justificativa or observacoes or "",
        quantidade=normalizar_decimal(quantidade),
        unidade=unidade or "",
        status=StatusSugestao.PENDENTE,
    )

    return sugestao


class BaseGeradorSugestao:
    """
    Classe base para geradores de sugestão.
    """

    tipo_sugestao: Optional[str] = None
    nome_conjunto: Optional[str] = None
    ordem_conjunto: Optional[int] = None

    def __init__(self, projeto):
        self.projeto = projeto

    def validar(self) -> None:
        """
        Sobrescrever quando necessário.
        """
        if not self.tipo_sugestao:
            raise ValueError("tipo_sugestao não definido no gerador.")
        if not self.nome_conjunto:
            raise ValueError("nome_conjunto não definido no gerador.")

    def limpar_pendentes(self, carga=None) -> int:
        self.validar()
        conjunto = obter_ou_criar_conjunto_por_nome(
            projeto=self.projeto,
            nome_conjunto=self.nome_conjunto,
        )
        return limpar_sugestoes_pendentes(
            self.projeto,
            tipo_sugestao=self.tipo_sugestao,
            carga=carga,
            conjunto=conjunto,
        )

    def criar_sugestao(
        self,
        *,
        descricao: str,
        produto=None,
        carga=None,
        justificativa: str = "",
        quantidade=Decimal("1.000"),
        unidade: str = "",
        observacoes: str = "",
    ) -> SugestaoItem:
        self.validar()

        return criar_sugestao_item(
            projeto=self.projeto,
            nome_conjunto=self.nome_conjunto,
            tipo_sugestao=self.tipo_sugestao,
            descricao=descricao,
            produto=produto,
            carga=carga,
            justificativa=justificativa,
            quantidade=quantidade,
            unidade=unidade,
            observacoes=observacoes,
            ordem_conjunto=self.ordem_conjunto,
        )

    def gerar(self):
        raise NotImplementedError("Implemente o método gerar() no gerador específico.")