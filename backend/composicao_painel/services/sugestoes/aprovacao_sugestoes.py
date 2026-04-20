from django.core.exceptions import ValidationError
from django.db import transaction

from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, SugestaoItem
from core.choices import StatusSugestaoChoices

STATUS_MARKER = "[STATUS_APROVACAO]"


def _limpar_status_aprovacao_texto(observacoes: str) -> str:
    linhas = [linha for linha in (observacoes or "").splitlines() if STATUS_MARKER not in linha]
    return "\n".join(linhas).strip()


def _anexar_status_aprovacao(observacoes: str, status_texto: str) -> str:
    base = _limpar_status_aprovacao_texto(observacoes)
    marcador = f"{STATUS_MARKER} {status_texto.strip()}"
    if not base:
        return marcador
    return f"{base}\n\n{marcador}"


@transaction.atomic
def aprovar_sugestao_item(
    sugestao: SugestaoItem,
    produto_substituto: Produto | None = None,
    usuario_nome: str | None = None,
) -> ComposicaoItem:
    if sugestao is None:
        raise ValidationError("Sugestão não informada.")

    if not isinstance(sugestao, SugestaoItem):
        raise ValidationError("Objeto informado não é uma Sugestão de Item válida.")

    if sugestao.pk is None:
        raise ValidationError("A sugestão precisa estar salva no banco antes da aprovação.")

    produto_final = sugestao.produto
    houve_alteracao = False
    if produto_substituto is not None:
        if produto_substituto.categoria != sugestao.categoria_produto:
            raise ValidationError(
                "O produto escolhido não pertence à mesma categoria da sugestão."
            )
        produto_final = produto_substituto
        houve_alteracao = True

    responsavel = (usuario_nome or "").strip() or "utilizador"
    status_aprovacao = (
        f"Alterado por {responsavel} e aprovado"
        if houve_alteracao
        else f"Sugerido pelo sistema e aprovado por {responsavel}"
    )

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
            "observacoes": _anexar_status_aprovacao(sugestao.observacoes, status_aprovacao),
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


@transaction.atomic
def reabrir_composicao_item_para_sugestao(
    item: ComposicaoItem, *, usuario_nome: str | None = None
) -> SugestaoItem:
    if item is None:
        raise ValidationError("Item da composição não informado.")

    if not isinstance(item, ComposicaoItem):
        raise ValidationError("Objeto informado não é um Item da Composição válido.")

    if item.pk is None:
        raise ValidationError("O item da composição precisa estar salvo antes da reabertura.")

    responsavel = (usuario_nome or "").strip() or "utilizador"
    observacoes_base = _limpar_status_aprovacao_texto(item.observacoes or "")
    observacoes_reabertura = f"Reaberto para revisão por {responsavel}."
    observacoes = (
        f"{observacoes_base}\n\n{observacoes_reabertura}".strip()
        if observacoes_base
        else observacoes_reabertura
    )

    sugestao, _ = SugestaoItem.objects.update_or_create(
        projeto=item.projeto,
        parte_painel=item.parte_painel,
        categoria_produto=item.categoria_produto,
        carga=item.carga,
        defaults={
            "produto": item.produto,
            "quantidade": item.quantidade,
            "corrente_referencia_a": item.corrente_referencia_a,
            "memoria_calculo": item.memoria_calculo,
            "observacoes": observacoes,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": item.ordem,
        },
    )

    item.delete()
    return sugestao