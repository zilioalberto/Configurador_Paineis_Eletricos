"""Sugestões de inversor de frequência para motores com partida INVERSOR."""

from __future__ import annotations

from math import sqrt
from typing import Literal, Optional

from cargas.models import Carga, CargaMotor
from catalogo.selectors.inversores_frequencia import selecionar_inversores_frequencia
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
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices
from core.choices.produtos import NumeroFasesInversorFrequenciaChoices

_TOLERANCIA_TENSAO_FASE_V = 1


def _limpar_escopo_inversores_frequencia_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        carga=carga,
    ).delete()


def _tensao_motor_corresponde_fase_rede(
    tensao_projeto_v: int, tensao_motor_v: int
) -> bool:
    """Motor monofásico alimentado a partir de rede trifásica: Vmotor ≈ Vrede/√3."""
    esperado = int(round(tensao_projeto_v / sqrt(3)))
    return abs(int(tensao_motor_v) - esperado) <= _TOLERANCIA_TENSAO_FASE_V


def _parametros_entrada_inversor(
    tensao_projeto_v: int,
    tensao_motor_v: int,
    numero_fases_motor: int,
) -> tuple[
    Literal["igual", "monofasico_fase", "motor_trif_220_rede_380"] | None,
    dict,
]:
    """
    - igual: tensão nominal do projeto = tensão do motor → entrada do inversor = essa tensão.
    - motor_trif_220_rede_380: rede 380 V, motor trifásico 220 V → entrada 220 V, 1F.
    - monofasico_fase: tensão motor ≈ tensão projeto / √3 → entrada monofásica (1F);
      usa tensão de entrada = tensão nominal do projeto (rede) quando 220 ou 380 V.
      (Só aplica a cargas ainda compatíveis com o modelo; novas cargas exigem trifásico
      para partida INVERSOR.)
    """
    tp = int(tensao_projeto_v)
    tm = int(tensao_motor_v)
    if tp == tm:
        return "igual", {
            "tensao_entrada_v": tp,
            "numero_fases_entrada": None,
        }
    if (
        tp == int(TensaoChoices.V380)
        and tm == int(TensaoChoices.V220)
        and int(numero_fases_motor) == int(NumeroFasesChoices.TRIFASICO)
    ):
        return "motor_trif_220_rede_380", {
            "tensao_entrada_v": int(TensaoChoices.V220),
            "numero_fases_entrada": NumeroFasesInversorFrequenciaChoices.F1,
        }
    if _tensao_motor_corresponde_fase_rede(tp, tm):
        extra: dict = {
            "numero_fases_entrada": NumeroFasesInversorFrequenciaChoices.F1,
        }
        if tp in (220, 380):
            extra["tensao_entrada_v"] = tp
        return "monofasico_fase", extra
    return None, {}


def processar_sugestao_inversores_frequencia_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    print("-" * 100)
    print(f"[INVERSOR] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo != TipoCargaChoices.MOTOR:
        print("[INVERSOR] Tipo de carga não tratado. Pulando.")
        return None

    try:
        carga_motor = CargaMotor.objects.get(carga=carga)
    except CargaMotor.DoesNotExist:
        _limpar_escopo_inversores_frequencia_carga(projeto, carga)
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": "Carga MOTOR sem registro em CargaMotor.",
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[INVERSOR]\nCarga: {carga}\nMotivo: CargaMotor inexistente."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 46,
            },
        )
        return None

    if carga_motor.tipo_partida != TipoPartidaMotorChoices.INVERSOR:
        _limpar_escopo_inversores_frequencia_carga(projeto, carga)
        print("[INVERSOR] Partida diferente de INVERSOR. Escopo limpo.")
        return None

    _limpar_escopo_inversores_frequencia_carga(projeto, carga)

    modo, filtros_entrada = _parametros_entrada_inversor(
        projeto.tensao_nominal,
        carga_motor.tensao_motor,
        carga_motor.numero_fases,
    )
    if modo is None:
        descricao = (
            "Tensão do motor e do projeto não se enquadram nas regras de sugestão "
            "de inversor (igualdade ou aproximação V/√3)."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": carga_motor.corrente_calculada_a,
                "memoria_calculo": (
                    f"[INVERSOR]\n"
                    f"Carga: {carga}\n"
                    f"Tensão projeto: {projeto.tensao_nominal} V\n"
                    f"Tensão motor: {carga_motor.tensao_motor} V\n"
                    f"Motivo: configuração não coberta automaticamente."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 46,
            },
        )
        return None

    corrente_motor = carga_motor.corrente_calculada_a
    if corrente_motor is None:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": "Corrente calculada ausente para dimensionar inversor.",
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[INVERSOR]\nCarga: {carga}\nMotivo: corrente_calculada_a ausente."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 46,
            },
        )
        return None

    tensao_saida = int(carga_motor.tensao_motor)
    linha_modo = (
        f"Modo rede: {modo} | "
        f"tensao_entrada_v={filtros_entrada.get('tensao_entrada_v', '—')} | "
        f"numero_fases_entrada={filtros_entrada.get('numero_fases_entrada', 'qualquer')}"
    )

    opcoes = selecionar_inversores_frequencia(
        tensao_entrada_v=filtros_entrada.get("tensao_entrada_v"),
        tensao_saida_v=tensao_saida,
        corrente_nominal_min_a=corrente_motor,
        numero_fases_entrada=filtros_entrada.get("numero_fases_entrada"),
        niveis=1,
    )
    lista = list(opcoes)

    memoria_calculo = (
        f"[INVERSOR DE FREQUÊNCIA]\n"
        f"Carga: {carga}\n"
        f"Partida: {carga_motor.tipo_partida}\n"
        f"Corrente motor (mínimo catálogo): {corrente_motor} A\n"
        f"Tensão saída (motor): {tensao_saida} V\n"
        f"Tensão nominal projeto: {projeto.tensao_nominal} V\n"
        f"{linha_modo}\n"
    )

    if modo == "monofasico_fase" and "tensao_entrada_v" not in filtros_entrada:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": (
                    "Tensão nominal do projeto não permite filtrar tensao_entrada_v "
                    "do inversor (use 220 V ou 380 V na rede ou ajuste manual)."
                ),
                "corrente_referencia_a": corrente_motor,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 46,
            },
        )
        return None

    if not lista:
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
            carga=carga,
            indice_escopo=0,
            defaults={
                "descricao": f"Nenhum inversor compatível para a carga {carga}.",
                "corrente_referencia_a": corrente_motor,
                "memoria_calculo": memoria_calculo,
                "observacoes": (
                    f"corrente_nominal_a ≥ {corrente_motor} A | "
                    f"tensao_saida_v = {tensao_saida} V"
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 46,
            },
        )
        return None

    produto = lista[0]
    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto,
            "quantidade": 1,
            "corrente_referencia_a": corrente_motor,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 46,
        },
    )
    print(
        f"[INVERSOR] Sugestão id={sugestao.id} created={created} produto={produto.codigo}"
    )
    return sugestao


def reprocessar_inversores_frequencia_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    _limpar_escopo_inversores_frequencia_carga(projeto, carga)
    return processar_sugestao_inversores_frequencia_para_carga(projeto, carga)


def gerar_sugestoes_inversores_frequencia(projeto):
    print("\n" + "=" * 100)
    print("[INVERSOR] Iniciando gerar_sugestoes_inversores_frequencia")

    ds, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        carga__tipo=TipoCargaChoices.MOTOR,
    ).delete()
    dp, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        carga__tipo=TipoCargaChoices.MOTOR,
    ).delete()
    print(f"[INVERSOR] Removidos: sug={ds} pend={dp}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    )
    out = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[INVERSOR]",
        processar_sugestao_inversores_frequencia_para_carga,
    )

    print(f"[INVERSOR] Total sugestões: {len(out)} | projeto={projeto.id}")
    print("=" * 100 + "\n")
    return out
