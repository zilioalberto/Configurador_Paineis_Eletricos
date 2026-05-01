"""
Pendências para cargas que não se enquadram em nenhuma regra dos geradores de sugestão
do catálogo (contatora, disjuntor motor, etc.).
"""

from cargas.models import Carga, CargaResistencia
from composicao_painel.models import PendenciaItem

from core.choices import (
    PartesPainelChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
)


def _carga_tem_alguma_regra_gerador_catalogo(carga: Carga) -> bool:
    """
    True se alguma etapa atual de sugestão cobre a carga com regra de catálogo.

    - MOTOR: sempre há fluxo de contatora (AC3).
    - RESISTENCIA: há regra se tipo_acionamento for CONTATOR (contatora AC1) ou
      tipo_protecao for DISJUNTOR_MOTOR (disjuntor motor). Sem CargaResistencia,
      outras etapas já geram pendência específica — não duplicar aqui.
    """
    if carga.tipo == TipoCargaChoices.MOTOR:
        return True

    if carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            r = CargaResistencia.objects.get(carga=carga)
        except CargaResistencia.DoesNotExist:
            return True

        if r.tipo_acionamento == TipoAcionamentoResistenciaChoices.CONTATOR:
            return True
        if r.tipo_protecao == TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR:
            return True
        return False

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
