from typing import Optional

from cargas.models import Carga, CargaMotor, CargaResistencia
from composicao_painel.models import SugestaoItem, PendenciaItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor

from core.choices import (
    PartesPainelChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import (
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)


def _limpar_escopo_disjuntor_motor_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        carga=carga,
    ).delete()


def processar_sugestao_disjuntor_motor_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Gera ou atualiza sugestão/pendência de disjuntor motor para uma carga MOTOR
    (proteção DISJUNTOR_MOTOR) ou RESISTENCIA (tipo_protecao DISJUNTOR_MOTOR).
    """
    print("-" * 100)
    print(f"[DISJUNTORES MOTOR] Processando carga: id={carga.id} | carga={carga}")

    corrente_referencia = None
    tipo_protecao_label = None
    memoria_tipo_protecao = ""
    tipo_protecao_kw: str | None = None

    if carga.tipo == TipoCargaChoices.MOTOR:
        try:
            carga_motor = CargaMotor.objects.get(carga=carga)
            print(f"[DISJUNTORES MOTOR] CargaMotor encontrada: id={carga_motor.id}")
        except CargaMotor.DoesNotExist:
            descricao = "Carga do tipo MOTOR sem registro correspondente em CargaMotor."

            memoria_calculo = (
                f"[DISJUNTOR MOTOR]\n"
                f"Carga: {carga}\n"
                f"Tipo de carga: {carga.tipo}\n"
                f"Motivo: registro CargaMotor não encontrado."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )

            print("[DISJUNTORES MOTOR] Pendência criada: CargaMotor não encontrada.")
            return None

        print(f"[DISJUNTORES MOTOR] Tipo proteção: {carga_motor.tipo_protecao}")

        if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.DISJUNTOR_MOTOR:
            _limpar_escopo_disjuntor_motor_carga(projeto, carga)
            print(
                "[DISJUNTORES MOTOR] Tipo de proteção diferente de DISJUNTOR_MOTOR. Pulando carga."
            )
            return None

        corrente_referencia = carga_motor.corrente_calculada_a
        tipo_protecao_label = carga_motor.tipo_protecao
        memoria_tipo_protecao = f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"

    elif carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            carga_resistencia = CargaResistencia.objects.get(carga=carga)
            print(
                f"[DISJUNTORES MOTOR] CargaResistencia encontrada: id={carga_resistencia.id}"
            )
        except CargaResistencia.DoesNotExist:
            descricao = (
                "Carga do tipo RESISTENCIA sem registro correspondente em CargaResistencia."
            )

            memoria_calculo = (
                f"[DISJUNTOR MOTOR]\n"
                f"Carga: {carga}\n"
                f"Tipo de carga: {carga.tipo}\n"
                f"Motivo: registro CargaResistencia não encontrado."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )

            print("[DISJUNTORES MOTOR] Pendência criada: CargaResistencia não encontrada.")
            return None

        print(f"[DISJUNTORES MOTOR] Tipo proteção (resistência): {carga_resistencia.tipo_protecao}")

        if carga_resistencia.tipo_protecao != TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR:
            _limpar_escopo_disjuntor_motor_carga(projeto, carga)
            print(
                "[DISJUNTORES MOTOR] Proteção da resistência diferente de DISJUNTOR_MOTOR. "
                "Pulando carga."
            )
            return None

        corrente_referencia = carga_resistencia.corrente_calculada_a
        tipo_protecao_label = carga_resistencia.tipo_protecao
        tipo_protecao_kw = carga_resistencia.tipo_protecao
        memoria_tipo_protecao = (
            f"Tipo de proteção da resistência: {carga_resistencia.tipo_protecao}\n"
        )

    else:
        print("[DISJUNTORES MOTOR] Tipo de carga não tratado para disjuntor motor. Pulando.")
        return None

    print(f"[DISJUNTORES MOTOR] Corrente de referência: {corrente_referencia}")

    if corrente_referencia is None:
        descricao = "Corrente calculada não encontrada para seleção do disjuntor motor."

        memoria_calculo = (
            f"[DISJUNTOR MOTOR]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"{memoria_tipo_protecao}"
            f"Motivo: corrente_calculada_a não encontrada."
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print("[DISJUNTORES MOTOR] Pendência criada: corrente calculada ausente.")
        return None

    opcoes = selecionar_disjuntores_motor(
        corrente_nominal=corrente_referencia,
        modo_montagem=None,
        niveis=1,
        tipo_carga=carga.tipo,
        tipo_protecao=tipo_protecao_kw,
    )

    opcoes_lista = list(opcoes)
    print(
        f"[DISJUNTORES MOTOR] Quantidade de opções retornadas pelo selector: {len(opcoes_lista)}"
    )

    memoria_calculo = (
        f"[DISJUNTOR MOTOR]\n"
        f"Carga: {carga}\n"
        f"Tipo de carga: {carga.tipo}\n"
        f"{memoria_tipo_protecao}"
        f"Corrente de referência: {corrente_referencia} A\n"
        f"Critério: faixa_ajuste_min_a <= corrente <= faixa_ajuste_max_a\n"
        f"Regra de ordenação: maior sobra superior\n"
        f"Critério final: primeiro item compatível retornado pelo selector"
    )

    if not opcoes_lista:
        descricao = (
            f"Nenhum disjuntor motor compatível encontrado para a carga {carga}."
        )

        observacoes = (
            f"Corrente requerida: {corrente_referencia} A | "
            f"Tipo de proteção: {tipo_protecao_label}"
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_referencia,
                "memoria_calculo": memoria_calculo,
                "observacoes": observacoes,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print(
            "[DISJUNTORES MOTOR] Pendência criada: nenhum disjuntor motor compatível encontrado."
        )
        return None

    produto_selecionado = opcoes_lista[0]
    print(f"[DISJUNTORES MOTOR] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        carga=carga,
        defaults={
            "produto": produto_selecionado,
            "quantidade": 1,
            "corrente_referencia_a": corrente_referencia,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 30,
        },
    )

    print(
        f"[DISJUNTORES MOTOR] Sugestão salva: id={sugestao.id} | "
        f"created={created} | produto={sugestao.produto}"
    )

    return sugestao


def reprocessar_disjuntor_motor_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """Remove sugestão/pendência só desta carga e recalcula."""
    _limpar_escopo_disjuntor_motor_carga(projeto, carga)
    return processar_sugestao_disjuntor_motor_para_carga(projeto, carga)


def gerar_sugestoes_disjuntores_motor(projeto):
    """
    Gera sugestões de disjuntores motor para cargas MOTOR e RESISTENCIA.

    MOTOR: só se CargaMotor.tipo_protecao for DISJUNTOR_MOTOR.
    RESISTENCIA: só se CargaResistencia.tipo_protecao for DISJUNTOR_MOTOR
    (alinhado a catalogo.selectors.selecionar_disjuntores_motor).

    Percorre todas as cargas MOTOR/RESISTENCIA ativas para aplicar limpeza quando
    a proteção deixa de ser disjuntor motor.

    Remove antes sugestões/pendências de disjuntor motor dessas cargas no projeto.
    """
    print("\n" + "=" * 100)
    print("[DISJUNTORES MOTOR] Iniciando gerar_sugestoes_disjuntores_motor")
    print(f"[DISJUNTORES MOTOR] Projeto: id={projeto.id} | projeto={projeto}")

    tipos_disjuntor = [TipoCargaChoices.MOTOR, TipoCargaChoices.RESISTENCIA]

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ).filter(carga__tipo__in=tipos_disjuntor).delete()
    print(f"[DISJUNTORES MOTOR] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ).filter(carga__tipo__in=tipos_disjuntor).delete()
    print(f"[DISJUNTORES MOTOR] Pendências antigas removidas: {deletados_pendencias}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo__in=tipos_disjuntor,
    )

    print(f"[DISJUNTORES MOTOR] Total de cargas elegíveis: {cargas.count()}")

    sugestoes_criadas = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[DISJUNTORES MOTOR]",
        processar_sugestao_disjuntor_motor_para_carga,
    )

    print("-" * 100)
    print(f"[DISJUNTORES MOTOR] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[DISJUNTORES MOTOR] Finalizando gerar_sugestoes_disjuntores_motor")
    print("=" * 100 + "\n")

    return sugestoes_criadas
