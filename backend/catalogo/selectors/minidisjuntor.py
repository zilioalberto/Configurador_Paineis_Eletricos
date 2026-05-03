from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from core.choices.produtos import CategoriaProdutoNomeChoices


def selecionar_minidisjuntores(
    corrente_nominal: Decimal | float | int,
    modo_montagem: str | None = None,
    tensao_nominal_v: int | None = None,
    curva_disparo: str | None = None,
    numero_polos: str | None = None,
    niveis: int | None = 1,
    superior_a_corrente: bool = False,
) -> QuerySet[Produto]:
    """
    Minidisjuntores com corrente nominal >= corrente exigida (ou estritamente
    maior quando ``superior_a_corrente`` é True).
    """
    if corrente_nominal is None:
        return Produto.objects.none()

    qs_base = Produto.objects.filter(
        ativo=True,
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        especificacao_minidisjuntor__corrente_nominal_a__isnull=False,
    )
    if superior_a_corrente:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__corrente_nominal_a__gt=corrente_nominal,
        )
    else:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__corrente_nominal_a__gte=corrente_nominal,
        )

    if modo_montagem:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__modo_montagem=modo_montagem
        )
    if tensao_nominal_v is not None:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__tensao_nominal_v=tensao_nominal_v
        )
    if curva_disparo:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__curva_disparo=curva_disparo
        )
    if numero_polos:
        qs_base = qs_base.filter(
            especificacao_minidisjuntor__numero_polos=numero_polos
        )

    qs_base = qs_base.select_related("especificacao_minidisjuntor")

    if not niveis or niveis <= 0:
        return qs_base.order_by(
            "especificacao_minidisjuntor__corrente_nominal_a",
            "descricao",
        )

    correntes_compativeis = list(
        qs_base.order_by(
            "especificacao_minidisjuntor__corrente_nominal_a",
        )
        .values_list(
            "especificacao_minidisjuntor__corrente_nominal_a",
            flat=True,
        )
        .distinct()[:niveis]
    )

    if not correntes_compativeis:
        return Produto.objects.none()

    return qs_base.filter(
        especificacao_minidisjuntor__corrente_nominal_a__in=correntes_compativeis
    ).order_by(
        "especificacao_minidisjuntor__corrente_nominal_a",
        "descricao",
    )
