"""Regras de movimentação de cartões no Kanban (ordem, status e histórico)."""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.tarefas.models import (
    ColunaTarefa,
    MotivoEncerramentoSessaoChoices,
    SessaoTrabalhoTarefa,
    StatusSemanticoColunaChoices,
    Tarefa,
    TipoHistoricoTarefaChoices,
)
from apps.tarefas.services.historico import registrar_historico_tarefa


def _tarefas_ordenadas_coluna(coluna: ColunaTarefa, *, excluir_tarefa_id=None):
    qs = Tarefa.objects.select_for_update().filter(coluna=coluna)
    if excluir_tarefa_id:
        qs = qs.exclude(pk=excluir_tarefa_id)
    return list(qs.order_by("ordem", "prazo", "titulo", "id"))


def _aplicar_ordem_tarefas(tarefas):
    agora = timezone.now()
    atualizacoes = []
    for indice, tarefa in enumerate(tarefas):
        tarefa.ordem = indice
        tarefa.atualizado_em = agora
        atualizacoes.append(tarefa)

    if atualizacoes:
        Tarefa.objects.bulk_update(atualizacoes, ("ordem", "atualizado_em"))


def _coluna_finaliza_tarefa(coluna: ColunaTarefa):
    return coluna.status_semantico in (
        StatusSemanticoColunaChoices.CONCLUIDO,
        StatusSemanticoColunaChoices.FINALIZADA,
    )


def _encerrar_sessoes_ativas(tarefa: Tarefa):
    finalizado_em = timezone.now()
    sessoes = list(
        SessaoTrabalhoTarefa.objects.select_for_update()
        .select_related("colaborador")
        .filter(tarefa=tarefa, finalizado_em__isnull=True)
        .order_by("iniciado_em", "id")
    )
    sessoes_encerradas = []

    for sessao in sessoes:
        apontamento = sessao.encerrar(
            finalizado_em=finalizado_em,
            motivo=MotivoEncerramentoSessaoChoices.SISTEMA,
            observacoes="Contagem encerrada automaticamente ao mover a tarefa para Entregue.",
        )
        sessoes_encerradas.append((sessao, apontamento))

    return sessoes_encerradas


def mover_tarefa(*, tarefa: Tarefa, coluna_destino: ColunaTarefa, usuario, ordem=None):
    if tarefa.coluna.quadro_id != coluna_destino.quadro_id:
        raise ValidationError("A coluna de destino deve pertencer ao mesmo quadro.")

    sessoes_encerradas = []
    with transaction.atomic():
        coluna_origem = tarefa.coluna

        if coluna_origem_id := getattr(coluna_origem, "id", None):
            if coluna_origem_id != coluna_destino.id:
                origem_tarefas = _tarefas_ordenadas_coluna(
                    coluna_origem,
                    excluir_tarefa_id=tarefa.id,
                )
                _aplicar_ordem_tarefas(origem_tarefas)

        destino_tarefas = _tarefas_ordenadas_coluna(
            coluna_destino,
            excluir_tarefa_id=tarefa.id,
        )
        ordem_destino = len(destino_tarefas) if ordem is None else ordem
        ordem_destino = max(0, min(ordem_destino, len(destino_tarefas)))
        destino_tarefas.insert(ordem_destino, tarefa)

        for indice, item in enumerate(destino_tarefas):
            item.ordem = indice

        if _coluna_finaliza_tarefa(coluna_destino):
            sessoes_encerradas = _encerrar_sessoes_ativas(tarefa)

        tarefa.coluna = coluna_destino
        tarefa.save(update_fields=("coluna", "ordem", "status", "concluida_em", "atualizado_em"))
        _aplicar_ordem_tarefas(destino_tarefas)

    for sessao, apontamento in sessoes_encerradas:
        registrar_historico_tarefa(
            tarefa=tarefa,
            usuario=usuario,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas registrado ao mover a tarefa para Entregue.",
            dados={
                "apontamento": str(apontamento.id) if apontamento else None,
                "sessao": str(sessao.id),
                "colaborador": str(sessao.colaborador_id),
                "motivo_encerramento": sessao.motivo_encerramento,
            },
        )

    registrar_historico_tarefa(
        tarefa=tarefa,
        usuario=usuario,
        tipo=TipoHistoricoTarefaChoices.MOVIDA,
        descricao=f"Tarefa movida para {coluna_destino.nome}.",
        dados={
            "coluna_origem": str(coluna_origem.id),
            "coluna_destino": str(coluna_destino.id),
        },
        coluna_origem=coluna_origem,
        coluna_destino=coluna_destino,
    )
    return tarefa
