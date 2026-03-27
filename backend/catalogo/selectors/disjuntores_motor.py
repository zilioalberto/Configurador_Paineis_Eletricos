from decimal import Decimal

from django.db.models import F, ExpressionWrapper, DecimalField, QuerySet

from catalogo.models import Produto
from core.choices.produtos import CategoriaProdutoNomeChoices


def selecionar_disjuntores_motor(
    corrente_nominal: Decimal | float | int,
    modo_montagem: str | None = None,
    niveis: int | None = 1,
) -> QuerySet[Produto]:
    """
    Retorna disjuntores motor compatíveis com a corrente informada.

    Regras:
    - faixa_ajuste_min_a <= corrente_nominal <= faixa_ajuste_max_a
    - opcionalmente filtra por modo_montagem
    - ordena priorizando maior sobra superior
      (faixa_ajuste_max_a - corrente_nominal)
    - opcionalmente limita aos primeiros 'niveis' de faixas distintas

    Exemplo:
    corrente = 4.0 A

    Faixas compatíveis:
    - 3.0 a 5.0  -> sobra superior = 1.0
    - 3.5 a 8.0  -> sobra superior = 4.0

    Com a regra atual, a faixa 3.5 a 8.0 vem antes.
    """

    if corrente_nominal is None:
        return Produto.objects.none()

    qs_base = Produto.objects.filter(
        ativo=True,
        categoria__nome=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        especificacao_disjuntor_motor__faixa_ajuste_min_a__isnull=False,
        especificacao_disjuntor_motor__faixa_ajuste_max_a__isnull=False,
        especificacao_disjuntor_motor__faixa_ajuste_min_a__lte=corrente_nominal,
        especificacao_disjuntor_motor__faixa_ajuste_max_a__gte=corrente_nominal,
    )

    if modo_montagem:
        qs_base = qs_base.filter(
            especificacao_disjuntor_motor__modo_montagem=modo_montagem
        )

    qs_base = qs_base.select_related(
        "categoria",
        "especificacao_disjuntor_motor",
    ).annotate(
        sobra_superior_a=ExpressionWrapper(
            F("especificacao_disjuntor_motor__faixa_ajuste_max_a") - Decimal(str(corrente_nominal)),
            output_field=DecimalField(max_digits=12, decimal_places=3),
        )
    )

    qs_ordenado = qs_base.order_by(
        "-sobra_superior_a",
        "especificacao_disjuntor_motor__faixa_ajuste_min_a",
        "descricao",
    )

    if not niveis or niveis <= 0:
        return qs_ordenado

    faixas_compativeis = list(
        qs_ordenado.values_list(
            "especificacao_disjuntor_motor__faixa_ajuste_min_a",
            "especificacao_disjuntor_motor__faixa_ajuste_max_a",
        ).distinct()[:niveis]
    )

    if not faixas_compativeis:
        return Produto.objects.none()

    filtro = None
    from django.db.models import Q

    for faixa_min, faixa_max in faixas_compativeis:
        condicao = Q(
            especificacao_disjuntor_motor__faixa_ajuste_min_a=faixa_min,
            especificacao_disjuntor_motor__faixa_ajuste_max_a=faixa_max,
        )
        filtro = condicao if filtro is None else filtro | condicao

    return qs_ordenado.filter(filtro)