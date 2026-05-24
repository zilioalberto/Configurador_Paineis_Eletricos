"""Criação e manutenção do quadro Kanban padrão (Pendentes / Trabalhando / Entregue)."""

from django.db import transaction

from apps.tarefas.models import (
    ColunaTarefa,
    QuadroTarefa,
    StatusSemanticoColunaChoices,
    Tarefa,
)

COLUNAS_QUADRO_PADRAO = (
    ("Pendentes", 0, StatusSemanticoColunaChoices.PENDENTE),
    ("Trabalhando", 1, StatusSemanticoColunaChoices.EM_ANDAMENTO),
    ("Entregue", 2, StatusSemanticoColunaChoices.CONCLUIDO),
)


def _fundir_colunas_fora_do_padrao(quadro: QuadroTarefa) -> None:
    """Remove colunas extra do quadro (ordem ≥ 3 ou duplicadas), realocando tarefas."""
    canonical = list(
        ColunaTarefa.objects.filter(quadro=quadro, ordem__in=(0, 1, 2)).order_by("ordem")
    )
    if len(canonical) != 3:
        return

    por_ordem = {c.ordem: c for c in canonical}
    col_pendentes = por_ordem[0]
    col_andamento = por_ordem[1]
    col_final = por_ordem[2]
    manter_ids = {c.pk for c in canonical}

    extras = ColunaTarefa.objects.filter(quadro=quadro).exclude(pk__in=manter_ids)
    for coluna_extra in extras:
        sem = coluna_extra.status_semantico
        if sem in (
            StatusSemanticoColunaChoices.FINALIZADA,
            StatusSemanticoColunaChoices.CONCLUIDO,
        ):
            destino = col_final
        elif sem in (
            StatusSemanticoColunaChoices.INICIADA,
            StatusSemanticoColunaChoices.EM_ANDAMENTO,
            StatusSemanticoColunaChoices.BLOQUEADO,
        ):
            destino = col_andamento
        else:
            destino = col_pendentes

        with transaction.atomic():
            Tarefa.objects.filter(coluna=coluna_extra).update(coluna=destino)
            coluna_extra.delete()


def garantir_quadro_padrao_tarefas(*, usuario=None) -> QuadroTarefa:
    quadro = (
        QuadroTarefa.objects.filter(nome="Tarefas").first()
        or QuadroTarefa.objects.filter(nome="Execucao").first()
    )
    if quadro is None:
        quadro = QuadroTarefa.objects.create(
            nome="Tarefas",
            descricao="Kanban com Pendentes, Trabalhando e Entregue.",
            equipe="Operacional",
            ativo=True,
            criado_por=usuario if getattr(usuario, "is_authenticated", False) else None,
        )
    elif quadro.nome != "Tarefas":
        quadro.nome = "Tarefas"
        quadro.descricao = "Kanban com Pendentes, Trabalhando e Entregue."
        quadro.save(update_fields=("nome", "descricao", "atualizado_em"))
    if not quadro.ativo:
        quadro.ativo = True
        quadro.save(update_fields=("ativo", "atualizado_em"))

    # Fundir extras antes de renomear colunas canónicas (ordem 0–2), para não violar
    # UniqueConstraint(quadro, nome) ao definir "Trabalhando"/"Entregue" enquanto
    # ainda existir coluna extra com o mesmo nome (legado de quadros de 5 colunas).
    _fundir_colunas_fora_do_padrao(quadro)

    for nome, ordem, status_semantico in COLUNAS_QUADRO_PADRAO:
        coluna, criada = ColunaTarefa.objects.get_or_create(
            quadro=quadro,
            ordem=ordem,
            defaults={
                "nome": nome,
                "status_semantico": status_semantico,
            },
        )
        if not criada and (
            coluna.nome != nome or coluna.status_semantico != status_semantico
        ):
            coluna.nome = nome
            coluna.status_semantico = status_semantico
            coluna.save(update_fields=("nome", "status_semantico", "atualizado_em"))

    _fundir_colunas_fora_do_padrao(quadro)

    return quadro
