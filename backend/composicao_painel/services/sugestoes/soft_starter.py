"""Sugestões de soft starter para motores com partida SOFT_STARTER trifásicos."""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from cargas.models import Carga, CargaMotor
from catalogo.selectors.soft_starters import selecionar_soft_starters
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices
from core.choices.produtos import NumeroFaseControleSoftStarterChoices

_FATOR_CORRENTE_SOFT_STARTER = Decimal("1.2")


def _limpar_escopo_soft_starter_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        carga=carga,
    ).delete()


def _corrente_minima_catalogo(corrente_motor_a: Decimal) -> Decimal:
    return (corrente_motor_a * _FATOR_CORRENTE_SOFT_STARTER).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def processar_sugestao_soft_starter_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Soft starter quando: carga MOTOR, ``numero_fases`` trifásico (3),
    ``tipo_partida`` SOFT_STARTER, tensão do motor = tensão nominal do projeto.

    Catálogo: ``corrente_nominal_a`` ≥ ``corrente_calculada_a`` × 1,2,
    ``tensao_nominal_v`` = tensão nominal do projeto (e do motor),
    ``numero_fase_controle`` 3F.
    """
    print("-" * 100)
    print(f"[SOFT_STARTER] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo != TipoCargaChoices.MOTOR:
        print("[SOFT_STARTER] Tipo de carga não tratado. Pulando.")
        return None

    try:
        carga_motor = CargaMotor.objects.get(carga=carga)
    except CargaMotor.DoesNotExist:
        descricao = "Carga MOTOR sem registro em CargaMotor."
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[SOFT STARTER]\nCarga: {carga}\nMotivo: CargaMotor inexistente."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 45,
            },
        )
        return None

    if carga_motor.tipo_partida != TipoPartidaMotorChoices.SOFT_STARTER:
        _limpar_escopo_soft_starter_carga(projeto, carga)
        print("[SOFT_STARTER] Partida diferente de SOFT_STARTER. Escopo limpo.")
        return None

    if carga_motor.numero_fases != NumeroFasesChoices.TRIFASICO:
        _limpar_escopo_soft_starter_carga(projeto, carga)
        print("[SOFT_STARTER] Motor não é trifásico. Escopo limpo.")
        return None

    tensao_projeto = projeto.tensao_nominal
    tensao_motor = carga_motor.tensao_motor
    if tensao_projeto != tensao_motor:
        _limpar_escopo_soft_starter_carga(projeto, carga)
        descricao = (
            "Para sugerir soft starter, a tensão nominal do projeto deve ser "
            "igual à tensão do motor."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": carga_motor.corrente_calculada_a,
                "memoria_calculo": (
                    f"[SOFT STARTER]\n"
                    f"Carga: {carga}\n"
                    f"Tensão projeto: {tensao_projeto} V\n"
                    f"Tensão motor: {tensao_motor} V\n"
                    f"Motivo: tensões diferentes — alinhar cadastro ou ajuste manual."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 45,
            },
        )
        print("[SOFT_STARTER] Tensão projeto ≠ tensão motor. Pendência.")
        return None

    corrente_motor = carga_motor.corrente_calculada_a
    if corrente_motor is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": "Corrente calculada ausente para dimensionar soft starter.",
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[SOFT STARTER]\nCarga: {carga}\n"
                    f"Motivo: corrente_calculada_a não disponível."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 45,
            },
        )
        return None

    corrente_min = _corrente_minima_catalogo(corrente_motor)

    opcoes = selecionar_soft_starters(
        corrente_nominal_min_a=corrente_min,
        tensao_nominal_v=int(tensao_projeto),
        numero_fase_controle=NumeroFaseControleSoftStarterChoices.F3,
        niveis=1,
    )
    lista = list(opcoes)

    memoria_calculo = (
        f"[SOFT STARTER]\n"
        f"Carga: {carga}\n"
        f"Partida: {carga_motor.tipo_partida}\n"
        f"Corrente motor calculada: {corrente_motor} A\n"
        f"Corrente mínima catálogo (× {_FATOR_CORRENTE_SOFT_STARTER}): {corrente_min} A\n"
        f"Tensão nominal (projeto/motor/catálogo): {tensao_projeto} V\n"
        f"Controle: {NumeroFaseControleSoftStarterChoices.F3.label}\n"
    )

    if not lista:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    f"Nenhum soft starter compatível para a carga {carga}."
                ),
                "corrente_referencia_a": corrente_min,
                "memoria_calculo": memoria_calculo,
                "observacoes": (
                    f"corrente_nominal_a ≥ {corrente_min} A | "
                    f"tensao_nominal_v = {tensao_projeto} V"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 45,
            },
        )
        return None

    produto = lista[0]
    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto,
            "quantidade": 1,
            "corrente_referencia_a": corrente_min,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 45,
        },
    )
    print(
        f"[SOFT_STARTER] Sugestão id={sugestao.id} created={created} "
        f"produto={produto.codigo}"
    )
    return sugestao


def reprocessar_soft_starter_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    _limpar_escopo_soft_starter_carga(projeto, carga)
    return processar_sugestao_soft_starter_para_carga(projeto, carga)


def gerar_sugestoes_soft_starters(projeto):
    """Regenera sugestões de soft starter para motores elegíveis do projeto."""
    print("\n" + "=" * 100)
    print("[SOFT_STARTER] Iniciando gerar_sugestoes_soft_starters")

    deletados_sug, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        carga__tipo=TipoCargaChoices.MOTOR,
    ).delete()
    deletados_pen, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        carga__tipo=TipoCargaChoices.MOTOR,
    ).delete()
    print(f"[SOFT_STARTER] Removidos: sug={deletados_sug} pend={deletados_pen}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    )
    out = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[SOFT_STARTER]",
        processar_sugestao_soft_starter_para_carga,
    )

    print(f"[SOFT_STARTER] Total sugestões: {len(out)} | projeto={projeto.id}")
    print("=" * 100 + "\n")
    return out
