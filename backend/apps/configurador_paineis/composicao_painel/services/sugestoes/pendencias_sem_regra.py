"""
Pendências para cargas que não se enquadram em nenhuma regra dos geradores de sugestão
do catálogo (contatora, disjuntor motor, etc.).
"""

from apps.configurador_paineis.cargas.models import Carga, CargaResistencia, CargaSensor, CargaValvula
from apps.configurador_paineis.composicao_painel.models import PendenciaItem

from core.choices import (
    PartesPainelChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
    TipoProtecaoValvulaChoices,
)

_ACIONAMENTOS_RESISTENCIA_COM_REGRA = frozenset({
    TipoAcionamentoResistenciaChoices.CONTATOR,
    TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
    TipoAcionamentoResistenciaChoices.RELE_INTERFACE,
})

_PROTECOES_VALVULA_COM_REGRA = frozenset({
    TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
    TipoProtecaoValvulaChoices.SEM_PROTECAO,
    TipoProtecaoValvulaChoices.MINIDISJUNTOR,
})


def _resistencia_tem_regra_gerador_catalogo(carga: Carga) -> bool:
    try:
        r = CargaResistencia.objects.get(carga=carga)
    except CargaResistencia.DoesNotExist:
        return True

    if r.tipo_acionamento in _ACIONAMENTOS_RESISTENCIA_COM_REGRA:
        return True
    return r.tipo_protecao == TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR


def _valvula_tem_regra_gerador_catalogo(carga: Carga) -> bool:
    try:
        v = CargaValvula.objects.get(carga=carga)
    except CargaValvula.DoesNotExist:
        return False

    if v.tipo_acionamento in (
        TipoAcionamentoValvulaChoices.RELE_INTERFACE,
        TipoAcionamentoValvulaChoices.CONTATOR,
    ):
        return True
    return v.tipo_protecao in _PROTECOES_VALVULA_COM_REGRA


def _carga_tem_alguma_regra_gerador_catalogo(carga: Carga) -> bool:
    """
    True se alguma etapa atual de sugestão cobre a carga com regra de catálogo.
    """
    if carga.tipo == TipoCargaChoices.MOTOR:
        return True

    if carga.tipo == TipoCargaChoices.RESISTENCIA:
        return _resistencia_tem_regra_gerador_catalogo(carga)

    if carga.tipo == TipoCargaChoices.VALVULA:
        return _valvula_tem_regra_gerador_catalogo(carga)

    if carga.tipo == TipoCargaChoices.SENSOR:
        return CargaSensor.objects.filter(carga=carga).exists()

    return False


def _memoria_e_descricao_carga_sem_regra(carga: Carga) -> tuple[str, str]:
    descricao = (
        "Nenhuma sugestão automática do catálogo se aplica a esta carga com a "
        "configuração atual (revise acionamento/proteção ou inclua itens manualmente)."
    )
    linhas = [
        "[SEM_REGRA_SUGESTAO_CATALOGO]",
        f"Carga: {carga}",
        f"Tipo de carga: {carga.tipo}",
    ]
    if carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            r = CargaResistencia.objects.get(carga=carga)
            linhas.append(f"Tipo de acionamento: {r.tipo_acionamento}")
            linhas.append(f"Tipo de proteção: {r.tipo_protecao}")
            linhas.append("")
            linhas.append(
                "Regras atuais: contatora se acionamento CONTATOR; "
                "relé estado sólido se acionamento RELE_ESTADO_SOLIDO; "
                "relé de interface se acionamento RELE_INTERFACE; "
                "disjuntor motor se proteção DISJUNTOR_MOTOR."
            )
        except CargaResistencia.DoesNotExist:
            linhas.append("(Sem registro CargaResistência — outras pendências podem aplicar.)")
    else:
        linhas.append("")
        linhas.append(
            "Não há gerador de sugestão de catálogo para este tipo de carga nas etapas atuais."
        )

    return descricao, "\n".join(linhas)


def sincronizar_pendencias_cargas_sem_regra_catalogo(projeto) -> list[PendenciaItem]:
    """
    Remove pendências deste tipo no projeto e recria uma por carga ativa sem cobertura.
    Deve rodar após as etapas de sugestão (ex.: ao final do orquestrador).
    """
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.SEM_REGRA_SUGESTAO_AUTOMATICA,
    ).delete()

    criadas: list[PendenciaItem] = []
    cargas = Carga.objects.filter(projeto=projeto, ativo=True).order_by("tag", "id")

    for carga in cargas:
        if _carga_tem_alguma_regra_gerador_catalogo(carga):
            continue

        descricao, memoria = _memoria_e_descricao_carga_sem_regra(carga)
        p = PendenciaItem.objects.create(
            projeto=projeto,
            carga=carga,
            parte_painel=PartesPainelChoices.PROTECAO_GERAL,
            categoria_produto=CategoriaProdutoNomeChoices.SEM_REGRA_SUGESTAO_AUTOMATICA,
            descricao=descricao,
            memoria_calculo=memoria,
            corrente_referencia_a=None,
            observacoes="",
            status=StatusPendenciaChoices.ABERTA,
            ordem=15,
        )
        criadas.append(p)

    print(
        f"[PENDENCIAS_SEM_REGRA] Projeto {projeto.id}: "
        f"{len(criadas)} pendência(s) de carga sem regra de catálogo."
    )
    return criadas
