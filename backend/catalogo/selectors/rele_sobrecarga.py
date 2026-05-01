from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Q, QuerySet

from catalogo.models import Produto
from core.choices.produtos import CategoriaProdutoNomeChoices


def selecionar_reles_sobrecarga(
    corrente_nominal: Decimal | float | int,
    modo_montagem: str | None = None,
    niveis: int | None = 1,
) -> QuerySet[Produto]:
    """
    Relés de sobrecarga cuja faixa de ajuste envolve a corrente nominal informada.

    Mesma ideia de ``selecionar_disjuntores_motor``: prioriza maior folga na faixa
    superior e opcionalmente limita a quantidade de faixas distintas.
    """
    if corrente_nominal is None:
        return Produto.objects.none()

    qs_base = Produto.objects.filter(
        ativo=True,
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        especificacao_rele_sobrecarga__faixa_ajuste_min_a__isnull=False,
        especificacao_rele_sobrecarga__faixa_ajuste_max_a__isnull=False,
        especificacao_rele_sobrecarga__faixa_ajuste_min_a__lte=corrente_nominal,
        especificacao_rele_sobrecarga__faixa_ajuste_max_a__gte=corrente_nominal,
    )

    if modo_montagem:
        qs_base = qs_base.filter(
            especificacao_rele_sobrecarga__modo_montagem=modo_montagem
        )

    qs_base = qs_base.select_related("especificacao_rele_sobrecarga").annotate(
        sobra_superior_a=ExpressionWrapper(
            F("especificacao_rele_sobrecarga__faixa_ajuste_max_a")
            - Decimal(str(corrente_nominal)),
            output_field=DecimalField(max_digits=12, decimal_places=3),
        )
    )

    qs_ordenado = qs_base.order_by(
        "-sobra_superior_a",
        "especificacao_rele_sobrecarga__faixa_ajuste_min_a",
        "descricao",
    )

    if not niveis or niveis <= 0:
        return qs_ordenado

    faixas_compativeis = list(
        qs_ordenado.values_list(
            "especificacao_rele_sobrecarga__faixa_ajuste_min_a",
            "especificacao_rele_sobrecarga__faixa_ajuste_max_a",
        ).distinct()[:niveis]
    )

    if not faixas_compativeis:
        return Produto.objects.none()

    filtro = None
    for faixa_min, faixa_max in faixas_compativeis:
        condicao = Q(
            especificacao_rele_sobrecarga__faixa_ajuste_min_a=faixa_min,
            especificacao_rele_sobrecarga__faixa_ajuste_max_a=faixa_max,
        )
        filtro = condicao if filtro is None else filtro | condicao

    return qs_ordenado.filter(filtro)
