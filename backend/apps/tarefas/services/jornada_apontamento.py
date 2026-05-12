"""
Regras de apontamento de horas conforme jornada de trabalho do colaborador (RH).

Sem vínculo colaborador↔usuário ou sem jornada com horários: não restringe o cronómetro.
"""
from __future__ import annotations

from datetime import date, datetime, time, timezone as dt_timezone

from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone as dj_tz

from apps.rh.models import JornadaTrabalho
from apps.tarefas.models import MotivoEncerramentoSessaoChoices, SessaoTrabalhoTarefa


def obter_jornada_do_usuario(user) -> JornadaTrabalho | None:
    try:
        colab = user.colaborador_rh
    except ObjectDoesNotExist:
        return None
    if not colab.jornada_id:
        return None
    j = colab.jornada
    if not j.ativo:
        return None
    return j


def _combine(day: date, t: time) -> datetime:
    naive = datetime.combine(day, t)
    tz = dj_tz.get_current_timezone()
    return dj_tz.make_aware(naive, tz)


def segmentos_trabalho_no_dia(jornada: JornadaTrabalho, day: date) -> list[tuple[datetime, datetime]] | None:
    """
    Retorna lista de [início, fim] em horário local, ou None se a jornada não define horários.
    Lista vazia = dia sem trabalho segundo dias_semana.
    """
    if not jornada.hora_inicio or not jornada.hora_fim:
        return None

    dias = jornada.dias_semana or []
    if dias and day.weekday() not in dias:
        return []

    hi, hf = jornada.hora_inicio, jornada.hora_fim
    istart, iend = jornada.intervalo_inicio, jornada.intervalo_fim

    if (
        istart
        and iend
        and istart < iend
        and hi < istart
        and iend < hf
    ):
        return [
            (_combine(day, hi), _combine(day, istart)),
            (_combine(day, iend), _combine(day, hf)),
        ]
    return [(_combine(day, hi), _combine(day, hf))]


def instante_dentro_jornada(jornada: JornadaTrabalho | None, when: datetime) -> bool:
    if not jornada:
        return True
    local = dj_tz.localtime(when)
    segs = segmentos_trabalho_no_dia(jornada, local.date())
    if segs is None:
        return True
    if not segs:
        return False
    for a, b in segs:
        if a <= local <= b:
            return True
    return False


def usuario_pode_iniciar_cronometro_agora(user, quando: datetime | None = None) -> tuple[bool, str]:
    quando = quando or dj_tz.now()
    j = obter_jornada_do_usuario(user)
    if not j:
        return True, ""
    if not instante_dentro_jornada(j, quando):
        return False, (
            "Fora da sua jornada de trabalho cadastrada em RH. "
            "Inicie a contagem apenas no horário permitido."
        )
    return True, ""


def _segmento_que_contem(local_dt: datetime, segs: list[tuple[datetime, datetime]]) -> tuple[datetime, datetime] | None:
    for a, b in segs:
        if a <= local_dt <= b:
            return (a, b)
    return None


def max_finalizado_em_valido_na_sessao(
    sessao: SessaoTrabalhoTarefa,
    jornada: JornadaTrabalho,
    agora: datetime,
) -> datetime:
    """
    Maior instante de encerramento permitido para a sessão contínua até `agora`
    (respeita o segmento onde a sessão começou; não atravessa almoço nem cruza meia-noite).
    """
    ini_l = dj_tz.localtime(sessao.iniciado_em)
    agora_l = dj_tz.localtime(agora)
    segs = segmentos_trabalho_no_dia(jornada, ini_l.date())
    if segs is None:
        return agora
    if not segs:
        return sessao.iniciado_em

    seg = _segmento_que_contem(ini_l, segs)
    if not seg:
        return sessao.iniciado_em

    _, fim_seg = seg
    if agora_l.date() > ini_l.date():
        candidato_l = fim_seg
    else:
        candidato_l = min(agora_l, fim_seg)

    if candidato_l < ini_l:
        candidato_l = ini_l

    return candidato_l.astimezone(dt_timezone.utc)


def deve_encerrar_sessao_por_jornada(
    sessao: SessaoTrabalhoTarefa,
    agora: datetime,
) -> tuple[bool, datetime | None, str | None]:
    j = obter_jornada_do_usuario(sessao.colaborador)
    if not j or not j.hora_inicio or not j.hora_fim:
        return False, None, None

    max_fin = max_finalizado_em_valido_na_sessao(sessao, j, agora)
    if agora <= max_fin:
        return False, None, None

    ini_l = dj_tz.localtime(sessao.iniciado_em)
    segs = segmentos_trabalho_no_dia(j, ini_l.date())
    motivo = MotivoEncerramentoSessaoChoices.FIM_JORNADA
    if segs and j.intervalo_inicio:
        seg = _segmento_que_contem(ini_l, segs)
        if seg and seg[1].time() == j.intervalo_inicio:
            motivo = MotivoEncerramentoSessaoChoices.INICIO_INTERVALO

    return True, max_fin, motivo


def previsao_fim_segmento_sessao(
    sessao: SessaoTrabalhoTarefa,
    agora: datetime | None = None,
) -> datetime | None:
    """
    Instantâneo em UTC em que o cronómetro será encerrado pelo servidor se permanecer no mesmo segmento
    (fim do expediente ou início do intervalo). None se não há pausa automática prevista.
    """
    agora = agora or dj_tz.now()
    j = obter_jornada_do_usuario(sessao.colaborador)
    if not j or not j.hora_inicio or not j.hora_fim:
        return None
    ini_l = dj_tz.localtime(sessao.iniciado_em)
    agora_l = dj_tz.localtime(agora)
    segs = segmentos_trabalho_no_dia(j, ini_l.date())
    if not segs:
        return None
    seg = _segmento_que_contem(ini_l, segs)
    if not seg:
        return None
    _, fim_seg = seg
    if agora_l >= fim_seg:
        return None
    return fim_seg.astimezone(dt_timezone.utc)


def intervalo_horario_cabe_em_jornada(
    jornada: JornadaTrabalho,
    inicio: datetime,
    fim: datetime,
) -> bool:
    if not jornada.hora_inicio or not jornada.hora_fim:
        return True
    li = dj_tz.localtime(inicio)
    lf = dj_tz.localtime(fim)
    if lf <= li:
        return False
    d = li.date()
    if d != lf.date():
        return False
    segs = segmentos_trabalho_no_dia(jornada, d)
    if segs is None:
        return True
    if not segs:
        return False
    for a, b in segs:
        if a <= li and lf <= b:
            return True
    return False
