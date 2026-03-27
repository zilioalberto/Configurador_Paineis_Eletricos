from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from core.choices.produtos import CategoriaProdutoNomeChoices


def selecionar_seccionadoras(
    corrente_nominal: Decimal | float | int,
    tipo_montagem: str | None = None,
    niveis: int | None = 1,
) -> QuerySet[Produto]:
    """
    Retorna seccionadoras compatíveis com a corrente informada.

    Regras:
    - corrente_ac3_a >= corrente_nominal
    - opcionalmente filtra por tipo_montagem
    - limita os resultados aos primeiros 'niveis' de corrente compatível

    Exemplo:
    corrente_nominal = 14
    correntes disponíveis = [15, 20, 25, 32]

    niveis=1 -> retorna apenas produtos de 15 A
    niveis=2 -> retorna produtos de 15 A e 20 A
    niveis=3 -> retorna produtos de 15 A, 20 A e 25 A
    """
    
    print("Entrou em selecionar_seccionadoras com corrente_nominal_a =", corrente_nominal)

    if corrente_nominal is None:
        return Produto.objects.none()

    qs_base = Produto.objects.filter(
        ativo=True,
        categoria__nome=CategoriaProdutoNomeChoices.SECCIONADORA,
        especificacao_seccionadora__corrente_ac3_a__isnull=False,
        especificacao_seccionadora__corrente_ac3_a__gte=corrente_nominal,
    )

    if tipo_montagem:
        qs_base = qs_base.filter(
            especificacao_seccionadora__tipo_montagem=tipo_montagem
        )

    qs_base = qs_base.select_related(
        "categoria",
        "especificacao_seccionadora",
    )

    if not niveis or niveis <= 0:
        return qs_base.order_by(
            "especificacao_seccionadora__corrente_ac3_a",
            "descricao",
        )

    correntes_compativeis = list(
        qs_base.order_by(
            "especificacao_seccionadora__corrente_ac3_a"
        ).values_list(
            "especificacao_seccionadora__corrente_ac3_a",
            flat=True,
        ).distinct()[:niveis]
    )

    if not correntes_compativeis:
        return Produto.objects.none()

    return qs_base.filter(
        especificacao_seccionadora__corrente_ac3_a__in=correntes_compativeis
    ).order_by(
        "especificacao_seccionadora__corrente_ac3_a",
        "descricao",
    )