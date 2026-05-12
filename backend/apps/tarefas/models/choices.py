from django.db import models


class StatusSemanticoColunaChoices(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    INICIADA = "INICIADA", "Iniciada"
    FINALIZADA = "FINALIZADA", "Finalizada"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    BLOQUEADO = "BLOQUEADO", "Bloqueado"
    CONCLUIDO = "CONCLUIDO", "Concluido"
    CANCELADO = "CANCELADO", "Cancelado"


class TipoTarefaChoices(models.TextChoices):
    NAO_CLASSIFICADA = "NAO_CLASSIFICADA", "Nao classificada"
    PROPOSTA = "PROPOSTA", "Proposta"
    PRODUCAO = "PRODUCAO", "Producao"
    INTERNA = "INTERNA", "Interna"


class StatusTarefaChoices(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    INICIADA = "INICIADA", "Iniciada"
    ABERTA = "ABERTA", "Aberta"
    EM_ANDAMENTO = "EM_ANDAMENTO", "Em andamento"
    BLOQUEADA = "BLOQUEADA", "Bloqueada"
    CONCLUIDA = "CONCLUIDA", "Concluida"
    CANCELADA = "CANCELADA", "Cancelada"


class PrioridadeTarefaChoices(models.TextChoices):
    BAIXA = "BAIXA", "Baixa"
    MEDIA = "MEDIA", "Media"
    ALTA = "ALTA", "Alta"
    URGENTE = "URGENTE", "Urgente"


class StatusAprovacaoHoraChoices(models.TextChoices):
    PENDENTE = "PENDENTE", "Pendente"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    AJUSTADO = "AJUSTADO", "Ajustado"
    CANCELADO = "CANCELADO", "Cancelado"
    REPROVADO = "REPROVADO", "Reprovado"


class OrigemApontamentoHoraChoices(models.TextChoices):
    COLABORADOR = "COLABORADOR", "Colaborador"
    GESTOR = "GESTOR", "Gestor"
    SISTEMA = "SISTEMA", "Sistema"


class MotivoEncerramentoSessaoChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    FIM_JORNADA = "FIM_JORNADA", "Fim da jornada"
    INICIO_INTERVALO = "INICIO_INTERVALO", "Inicio de intervalo"
    AJUSTE_GESTOR = "AJUSTE_GESTOR", "Ajuste do gestor"
    SISTEMA = "SISTEMA", "Sistema"


class TipoHistoricoTarefaChoices(models.TextChoices):
    CRIADA = "CRIADA", "Criada"
    EDITADA = "EDITADA", "Editada"
    MOVIDA = "MOVIDA", "Movida"
    RESPONSAVEL = "RESPONSAVEL", "Responsavel alterado"
    PRAZO = "PRAZO", "Prazo alterado"
    CLASSIFICADA = "CLASSIFICADA", "Classificada"
    INICIADA = "INICIADA", "Iniciada"
    CONCLUIDA = "CONCLUIDA", "Concluida"
    APONTAMENTO = "APONTAMENTO", "Apontamento de horas"
