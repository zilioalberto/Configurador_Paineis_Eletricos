from apps.tarefas.models import HistoricoTarefa


def registrar_historico_tarefa(
    *,
    tarefa,
    usuario,
    tipo,
    descricao,
    dados=None,
    coluna_origem=None,
    coluna_destino=None,
    responsavel_anterior=None,
    responsavel_novo=None,
    prazo_anterior=None,
    prazo_novo=None,
):
    return HistoricoTarefa.objects.create(
        tarefa=tarefa,
        usuario=usuario if getattr(usuario, "is_authenticated", False) else None,
        tipo=tipo,
        descricao=descricao,
        dados=dados or {},
        coluna_origem=coluna_origem,
        coluna_destino=coluna_destino,
        responsavel_anterior=responsavel_anterior,
        responsavel_novo=responsavel_novo,
        prazo_anterior=prazo_anterior,
        prazo_novo=prazo_novo,
    )
