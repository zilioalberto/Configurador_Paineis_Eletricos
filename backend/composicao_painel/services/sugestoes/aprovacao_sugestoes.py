from django.core.exceptions import ValidationError
from django.db import transaction

from catalogo.models import Produto
from composicao_painel.models import SugestaoItem, ComposicaoItem
from core.choices import StatusSugestaoChoices


@transaction.atomic
def aprovar_sugestao_item(
    sugestao: SugestaoItem,
    produto_substituto: Produto | None = None,
) -> ComposicaoItem:
    if sugestao is None:
        raise ValidationError("Sugestão não informada.")

    if not isinstance(sugestao, SugestaoItem):
        raise ValidationError("Objeto informado não é uma Sugestão de Item válida.")

    if sugestao.pk is None:
        raise ValidationError("A sugestão precisa estar salva no banco antes da aprovação.")

    produto_final = sugestao.produto
    if produto_substituto is not None:
        if produto_substituto.categoria.nome != sugestao.categoria_produto:
            raise ValidationError(
                "O produto escolhido não pertence à mesma categoria da sugestão."
            )
        produto_final = produto_substituto

    sugestao.status = StatusSugestaoChoices.APROVADA
    sugestao.save(update_fields=["status"])

    composicao_item, _ = ComposicaoItem.objects.update_or_create(
        projeto=sugestao.projeto,
        parte_painel=sugestao.parte_painel,
        categoria_produto=sugestao.categoria_produto,
        carga=sugestao.carga,
        defaults={
            "produto": produto_final,
            "quantidade": sugestao.quantidade,
            "corrente_referencia_a": sugestao.corrente_referencia_a,
            "memoria_calculo": sugestao.memoria_calculo,
            "observacoes": sugestao.observacoes,
            "ordem": sugestao.ordem,
        },
    )

    sugestao.delete()

    return composicao_item


@transaction.atomic
def aprovar_sugestoes(queryset):
    itens_transferidos = []
    erros = []

    for sugestao in queryset:
        try:
            item = aprovar_sugestao_item(sugestao, produto_substituto=None)
            itens_transferidos.append(item)
        except Exception as exc:
            erros.append(
                f"Sugestão {getattr(sugestao, 'pk', 'sem_id')}: {str(exc)}"
            )

    return itens_transferidos, erros