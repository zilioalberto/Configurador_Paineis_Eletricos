from decimal import Decimal, ROUND_HALF_UP
from typing import List

from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor, CargaResistencia, CargaValvula
from composicao_painel.models import SugestaoItem, PendenciaItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga_lista,
)
from catalogo.selectors.contatoras import selecionar_contatoras

from core.choices import (
    PartesPainelChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoPartidaMotorChoices,
)

# Fatores de corrente AC-3 para contatoras em partida estrela-triângulo (IEC).
_FACTOR_Y_D_K1_K2 = Decimal("0.58")
_FACTOR_Y_D_K3 = Decimal("0.33")

_CORRENTE_AC3_MINIMA_FREIO_A = Decimal("6")


def _validar_projeto_contatora(projeto) -> None:
    if not projeto.tensao_comando:
        raise ValidationError("Projeto sem tensao_comando definida.")
    if not projeto.tipo_corrente_comando:
        raise ValidationError("Projeto sem tipo_corrente_comando definido.")


def _limpar_escopo_contatora_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        carga=carga,
    ).delete()


def _motor_exige_contatoras(carga_motor: CargaMotor) -> bool:
    return carga_motor.tipo_partida in (
        TipoPartidaMotorChoices.DIRETA,
        TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
    )


def _corrente_ac3_minima(corrente_motor_a: Decimal, fator: Decimal) -> Decimal:
    return (corrente_motor_a * fator).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def _pendencia_contatora(
    projeto,
    carga,
    *,
    descricao: str,
    memoria_calculo: str,
    corrente_referencia_a,
    observacoes: str = "",
    indice_escopo: int = 0,
) -> None:
    PendenciaItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        carga=carga,
        indice_escopo=indice_escopo,
        defaults={
            "descricao": descricao,
            "corrente_referencia_a": corrente_referencia_a,
            "memoria_calculo": memoria_calculo,
            "observacoes": observacoes,
            "status": StatusPendenciaChoices.ABERTA,
            "ordem": 40,
        },
    )


def _run_motor_contactor_etapas(
    projeto,
    carga,
    carga_motor: CargaMotor,
    etapas: list[tuple[int, Decimal, str, str]],
    *,
    titulo_bloco: str,
) -> List[SugestaoItem]:
    """
    etapas: (indice_escopo, corrente_ref, papel, texto_critério para memória).
    """
    corrente_motor = carga_motor.corrente_calculada_a
    selecionados: list[tuple[int, object, Decimal, str, str]] = []

    for indice, corrente_ref, papel, criterio in etapas:
        opcoes = selecionar_contatoras(
            tipo_carga=TipoCargaChoices.MOTOR,
            corrente_nominal=corrente_ref,
            tensao_comando=projeto.tensao_comando,
            tipo_corrente_comando=projeto.tipo_corrente_comando,
            modo_montagem=None,
            niveis=1,
            tipo_acionamento=None,
        )
        lista = list(opcoes)
        if not lista:
            memoria = (
                f"{titulo_bloco}\n"
                f"Carga: {carga}\n"
                f"Corrente do motor (referência): {corrente_motor} A\n"
                f"Falha ao selecionar {papel}: {criterio}\n"
                f"Bobina: {projeto.tensao_comando} V / {projeto.tipo_corrente_comando}\n"
            )
            _pendencia_contatora(
                projeto,
                carga,
                descricao=(
                    f"Nenhuma contatora compatível para {papel} na carga {carga}."
                ),
                memoria_calculo=memoria,
                corrente_referencia_a=corrente_ref,
                observacoes=criterio,
                indice_escopo=indice,
            )
            return []

        selecionados.append((indice, lista[0], corrente_ref, papel, criterio))

    sugestoes: List[SugestaoItem] = []
    for indice, produto, corrente_ref, papel, criterio in selecionados:
        memoria_calculo = (
            f"{titulo_bloco}\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Partida: {carga_motor.tipo_partida}\n"
            f"Reversível: {carga_motor.reversivel} | Freio: {carga_motor.freio_motor}\n"
            f"Corrente do motor: {corrente_motor} A\n"
            f"{papel}: {criterio}\n"
            f"Tensão bobina: {projeto.tensao_comando} V\n"
            f"Tipo corrente bobina: {projeto.tipo_corrente_comando}\n"
            f"Critério catálogo: corrente_ac3_a ≥ corrente exigida\n"
        )
        sug, _ = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
            carga=carga,
            indice_escopo=indice,
            defaults={
                "produto": produto,
                "quantidade": 1,
                "corrente_referencia_a": corrente_ref,
                "memoria_calculo": memoria_calculo,
                "observacoes": papel,
                "status": StatusSugestaoChoices.PENDENTE,
                "ordem": 40 + indice,
            },
        )
        sugestoes.append(sug)

    return sugestoes


def _processar_contatoras_estrela_triangulo(
    projeto, carga, carga_motor: CargaMotor
) -> List[SugestaoItem]:
    corrente_motor = carga_motor.corrente_calculada_a
    if corrente_motor is None:
        _pendencia_contatora(
            projeto,
            carga,
            descricao="Corrente de referência não calculada para contatoras Y-Δ.",
            memoria_calculo=(
                f"[CONTATORA — ESTRELA-TRIÂNGULO]\n"
                f"Carga: {carga}\n"
                f"Motivo: corrente_calculada_a ausente."
            ),
            corrente_referencia_a=None,
            indice_escopo=0,
        )
        return []

    if carga_motor.reversivel:
        i_linha = corrente_motor
        i_k2_tri = _corrente_ac3_minima(corrente_motor, _FACTOR_Y_D_K1_K2)
        i_k3_est = _corrente_ac3_minima(corrente_motor, _FACTOR_Y_D_K3)
        etapas: list[tuple[int, Decimal, str, str]] = [
            (
                0,
                i_linha,
                'Contatora principal K1 (reversão)',
                f"AC-3 ≥ corrente_calculada_a = {i_linha} A",
            ),
            (
                1,
                i_linha,
                'Contatora principal K1" (reversão)',
                f"AC-3 ≥ corrente_calculada_a = {i_linha} A",
            ),
            (
                2,
                i_k2_tri,
                "Contatora triângulo K2",
                f"AC-3 ≥ corrente_calculada_a × {_FACTOR_Y_D_K1_K2} = {i_k2_tri} A",
            ),
            (
                3,
                i_k3_est,
                "Contatora estrela K3",
                f"AC-3 ≥ corrente_calculada_a × {_FACTOR_Y_D_K3} = {i_k3_est} A",
            ),
        ]
    else:
        i_k1_k2 = _corrente_ac3_minima(corrente_motor, _FACTOR_Y_D_K1_K2)
        i_k3 = _corrente_ac3_minima(corrente_motor, _FACTOR_Y_D_K3)
        etapas = [
            (
                0,
                i_k1_k2,
                "Contatora principal K1",
                f"AC-3 ≥ corrente_calculada_a × {_FACTOR_Y_D_K1_K2} = {i_k1_k2} A",
            ),
            (
                1,
                i_k1_k2,
                "Contatora triângulo K2",
                f"AC-3 ≥ corrente_calculada_a × {_FACTOR_Y_D_K1_K2} = {i_k1_k2} A",
            ),
            (
                2,
                i_k3,
                "Contatora estrela K3",
                f"AC-3 ≥ corrente_calculada_a × {_FACTOR_Y_D_K3} = {i_k3} A",
            ),
        ]

    return _run_motor_contactor_etapas(
        projeto,
        carga,
        carga_motor,
        etapas,
        titulo_bloco="[CONTATORA — ESTRELA-TRIÂNGULO]",
    )


def _processar_contatoras_partida_direta(
    projeto, carga, carga_motor: CargaMotor
) -> List[SugestaoItem]:
    corrente_motor = carga_motor.corrente_calculada_a
    if corrente_motor is None:
        _pendencia_contatora(
            projeto,
            carga,
            descricao="Corrente de referência não calculada para contatoras partida direta.",
            memoria_calculo=(
                f"[CONTATORA — PARTIDA DIRETA]\n"
                f"Carga: {carga}\n"
                f"Motivo: corrente_calculada_a ausente."
            ),
            corrente_referencia_a=None,
            indice_escopo=0,
        )
        return []

    etapas: list[tuple[int, Decimal, str, str]] = [
        (
            0,
            corrente_motor,
            "Contatora partida direta (linha)",
            f"AC-3 ≥ corrente_calculada_a = {corrente_motor} A",
        ),
    ]
    if carga_motor.reversivel:
        etapas.append(
            (
                1,
                corrente_motor,
                "Contatora partida direta (reversão)",
                f"AC-3 ≥ corrente_calculada_a = {corrente_motor} A",
            ),
        )

    return _run_motor_contactor_etapas(
        projeto,
        carga,
        carga_motor,
        etapas,
        titulo_bloco="[CONTATORA — PARTIDA DIRETA]",
    )


def _sugestao_contatora_freio_motor(
    projeto,
    carga,
    carga_motor: CargaMotor,
    sugestoes_base: List[SugestaoItem],
) -> List[SugestaoItem]:
    if not carga_motor.freio_motor:
        return []

    indice = max((s.indice_escopo for s in sugestoes_base), default=-1) + 1
    corrente_ref = _CORRENTE_AC3_MINIMA_FREIO_A
    papel = "Contatora freio de motor"
    criterio = f"AC-3 ≥ {_CORRENTE_AC3_MINIMA_FREIO_A} A (acionamento do freio)"

    opcoes = selecionar_contatoras(
        tipo_carga=TipoCargaChoices.MOTOR,
        corrente_nominal=corrente_ref,
        tensao_comando=projeto.tensao_comando,
        tipo_corrente_comando=projeto.tipo_corrente_comando,
        modo_montagem=None,
        niveis=1,
        tipo_acionamento=None,
    )
    lista = list(opcoes)
    if not lista:
        memoria = (
            f"[CONTATORA — FREIO MOTOR]\n"
            f"Carga: {carga}\n"
            f"Corrente mínima exigida (AC-3): {corrente_ref} A\n"
            f"Bobina: {projeto.tensao_comando} V / {projeto.tipo_corrente_comando}\n"
        )
        _pendencia_contatora(
            projeto,
            carga,
            descricao=(
                f"Nenhuma contatora compatível para freio de motor na carga {carga}."
            ),
            memoria_calculo=memoria,
            corrente_referencia_a=corrente_ref,
            observacoes=criterio,
            indice_escopo=indice,
        )
        return []

    corrente_motor = carga_motor.corrente_calculada_a
    memoria_calculo = (
        f"[CONTATORA — FREIO MOTOR]\n"
        f"Carga: {carga}\n"
        f"Corrente do motor: {corrente_motor} A\n"
        f"{papel}: {criterio}\n"
        f"Tensão bobina: {projeto.tensao_comando} V\n"
        f"Tipo corrente bobina: {projeto.tipo_corrente_comando}\n"
    )
    sug, _ = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        carga=carga,
        indice_escopo=indice,
        defaults={
            "produto": lista[0],
            "quantidade": 1,
            "corrente_referencia_a": corrente_ref,
            "memoria_calculo": memoria_calculo,
            "observacoes": papel,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 40 + indice,
        },
    )
    return [sug]


def _anexar_freio_se_necessario(
    projeto,
    carga,
    carga_motor: CargaMotor,
    sugestoes_base: List[SugestaoItem],
) -> List[SugestaoItem]:
    extra = _sugestao_contatora_freio_motor(
        projeto, carga, carga_motor, sugestoes_base
    )
    return sugestoes_base + extra


def processar_sugestao_contatora_para_carga(projeto, carga) -> List[SugestaoItem]:
    """
    Gera ou atualiza sugestão(ões) / pendência de contatora para uma única carga.

    - MOTOR DIRETA: uma ou duas contatoras (reversível: linha + reversão), AC-3 ≥ In.
    - MOTOR ESTRELA_TRIANGULO: três contatoras (K1/K2 0,58 In; K3 0,33 In) ou,
      se reversível, quatro (K1 e K1" com In; K2 tri 0,58 In; K3 estrela 0,33 In).
    - MOTOR com freio_motor: mais uma contatora AC-3 ≥ 6 A.
    - RESISTENCIA: só se tipo_acionamento CONTATOR (AC-1), índice de escopo 0.
    - VALVULA: só se tipo_acionamento CONTATOR; catálogo AC-3 ≥ corrente
      consumida (mA→A); quantidade = ``quantidade_solenoides``.
    """
    _validar_projeto_contatora(projeto)

    print("-" * 100)
    print(f"[CONTATORAS] Processando carga: id={carga.id} | carga={carga}")
    print(f"[CONTATORAS] Tipo da carga: {carga.tipo}")

    corrente_referencia = None
    campo_catalogo = None
    tipo_acionamento_para_selector = None
    quantidade_contatora = Decimal("1")
    memoria_linha_corrente_valvula = ""

    if carga.tipo == TipoCargaChoices.MOTOR:
        print("[CONTATORAS] Carga do tipo MOTOR")

        try:
            carga_motor = CargaMotor.objects.get(carga_id=carga.pk)
            carga_motor.refresh_from_db()
            print(f"[CONTATORAS] CargaMotor encontrada: id={carga_motor.id}")
        except CargaMotor.DoesNotExist:
            descricao = (
                "Carga do tipo MOTOR sem registro correspondente em CargaMotor."
            )

            _pendencia_contatora(
                projeto,
                carga,
                descricao=descricao,
                memoria_calculo=(
                    f"[CONTATORA]\n"
                    f"Carga: {carga}\n"
                    f"Tipo de carga: {carga.tipo}\n"
                    f"Motivo: registro CargaMotor não encontrado."
                ),
                corrente_referencia_a=None,
                indice_escopo=0,
            )
            print("[CONTATORAS] Pendência criada: CargaMotor não encontrada.")
            return []

        if not _motor_exige_contatoras(carga_motor):
            _limpar_escopo_contatora_carga(projeto, carga)
            print(
                "[CONTATORAS] Partida do motor não exige contatoras "
                f"({carga_motor.tipo_partida}). Pulando."
            )
            return []

        if carga_motor.tipo_partida == TipoPartidaMotorChoices.ESTRELA_TRIANGULO:
            print("[CONTATORAS] Partida estrela-triângulo.")
            sugs = _processar_contatoras_estrela_triangulo(
                projeto, carga, carga_motor
            )
            if not sugs:
                return []
            return _anexar_freio_se_necessario(
                projeto, carga, carga_motor, sugs
            )

        if carga_motor.tipo_partida == TipoPartidaMotorChoices.DIRETA:
            print("[CONTATORAS] Partida direta.")
            sugs = _processar_contatoras_partida_direta(projeto, carga, carga_motor)
            if not sugs:
                return []
            return _anexar_freio_se_necessario(
                projeto, carga, carga_motor, sugs
            )

        return []

    elif carga.tipo == TipoCargaChoices.RESISTENCIA:
        print("[CONTATORAS] Carga do tipo RESISTENCIA")

        try:
            carga_resistencia = CargaResistencia.objects.get(carga=carga)
            print(
                f"[CONTATORAS] CargaResistencia encontrada: id={carga_resistencia.id}"
            )
        except CargaResistencia.DoesNotExist:
            descricao = (
                "Carga do tipo RESISTENCIA sem registro correspondente em CargaResistencia."
            )

            _pendencia_contatora(
                projeto,
                carga,
                descricao=descricao,
                memoria_calculo=(
                    f"[CONTATORA]\n"
                    f"Carga: {carga}\n"
                    f"Tipo de carga: {carga.tipo}\n"
                    f"Motivo: registro CargaResistencia não encontrado."
                ),
                corrente_referencia_a=None,
                indice_escopo=0,
            )
            print("[CONTATORAS] Pendência criada: CargaResistencia não encontrada.")
            return []

        corrente_referencia = carga_resistencia.corrente_calculada_a
        campo_catalogo = "corrente_ac1_a"
        tipo_acionamento_para_selector = carga_resistencia.tipo_acionamento
        if (
            tipo_acionamento_para_selector
            != TipoAcionamentoResistenciaChoices.CONTATOR
        ):
            _limpar_escopo_contatora_carga(projeto, carga)
            print(
                "[CONTATORAS] Resistência sem acionamento por contator; "
                "não gera sugestão de contatora."
            )
            return []

    elif carga.tipo == TipoCargaChoices.VALVULA:
        print("[CONTATORAS] Carga do tipo VALVULA")

        try:
            carga_valvula = CargaValvula.objects.get(carga=carga)
            print(
                f"[CONTATORAS] CargaValvula encontrada: id={carga_valvula.id}"
            )
        except CargaValvula.DoesNotExist:
            descricao = (
                "Carga do tipo VALVULA sem registro correspondente em CargaValvula."
            )
            _pendencia_contatora(
                projeto,
                carga,
                descricao=descricao,
                memoria_calculo=(
                    f"[CONTATORA]\n"
                    f"Carga: {carga}\n"
                    f"Tipo de carga: {carga.tipo}\n"
                    f"Motivo: registro CargaValvula não encontrado."
                ),
                corrente_referencia_a=None,
                indice_escopo=0,
            )
            print("[CONTATORAS] Pendência criada: CargaValvula não encontrada.")
            return []

        if carga_valvula.tipo_acionamento != TipoAcionamentoValvulaChoices.CONTATOR:
            _limpar_escopo_contatora_carga(projeto, carga)
            print(
                "[CONTATORAS] Válvula sem acionamento por contator; "
                "não gera sugestão de contatora."
            )
            return []

        corrente_referencia = (
            Decimal(carga_valvula.corrente_consumida_ma) / Decimal("1000")
        ).quantize(Decimal("0.0001"))
        campo_catalogo = "corrente_ac3_a"
        tipo_acionamento_para_selector = carga_valvula.tipo_acionamento
        quantidade_contatora = Decimal(carga_valvula.quantidade_solenoides)
        memoria_linha_corrente_valvula = (
            f"Corrente consumida (válvula): {carga_valvula.corrente_consumida_ma} mA "
            f"→ referência AC-3: {corrente_referencia} A\n"
        )

    else:
        print(
            f"[CONTATORAS] Tipo de carga {carga.tipo} não tratado para contatora. Pulando."
        )
        return []

    print(f"[CONTATORAS] Corrente de referência: {corrente_referencia}")
    print(f"[CONTATORAS] Campo do catálogo: {campo_catalogo}")
    print(f"[CONTATORAS] Tensão bobina requerida: {projeto.tensao_comando}")
    print(
        f"[CONTATORAS] Tipo corrente bobina requerido: {projeto.tipo_corrente_comando}"
    )

    if corrente_referencia is None:
        descricao = "Corrente de referência não calculada para seleção da contatora."

        _pendencia_contatora(
            projeto,
            carga,
            descricao=descricao,
            memoria_calculo=(
                f"[CONTATORA]\n"
                f"Carga: {carga}\n"
                f"Tipo de carga: {carga.tipo}\n"
                f"Motivo: corrente de referência não encontrada."
            ),
            corrente_referencia_a=None,
            indice_escopo=0,
        )
        print("[CONTATORAS] Pendência criada: corrente de referência ausente.")
        return []

    opcoes = selecionar_contatoras(
        tipo_carga=carga.tipo,
        corrente_nominal=corrente_referencia,
        tensao_comando=projeto.tensao_comando,
        tipo_corrente_comando=projeto.tipo_corrente_comando,
        modo_montagem=None,
        niveis=1,
        tipo_acionamento=tipo_acionamento_para_selector,
    )

    opcoes_lista = list(opcoes)
    print(
        f"[CONTATORAS] Quantidade de opções retornadas pelo selector: {len(opcoes_lista)}"
    )

    linha_acionamento = ""
    if carga.tipo == TipoCargaChoices.RESISTENCIA and tipo_acionamento_para_selector:
        linha_acionamento = (
            f"Tipo de acionamento (resistência): {tipo_acionamento_para_selector}\n"
        )
    elif carga.tipo == TipoCargaChoices.VALVULA and tipo_acionamento_para_selector:
        linha_acionamento = (
            f"Tipo de acionamento (válvula): {tipo_acionamento_para_selector}\n"
            f"Quantidade (solenoides / contatoras): {quantidade_contatora}\n"
        )

    memoria_calculo = (
        f"[CONTATORA]\n"
        f"Carga: {carga}\n"
        f"Tipo de carga: {carga.tipo}\n"
        f"{linha_acionamento}"
        f"{memoria_linha_corrente_valvula}"
        f"Corrente de referência: {corrente_referencia} A\n"
        f"Campo do catálogo considerado: {campo_catalogo}\n"
        f"Tensão bobina requerida: {projeto.tensao_comando} V\n"
        f"Tipo de corrente bobina requerida: {projeto.tipo_corrente_comando}\n"
        f"Critério final: menor item compatível"
    )

    if not opcoes_lista:
        descricao = (
            f"Nenhuma contatora compatível encontrada para a carga {carga}."
        )
        observacoes = (
            f"Corrente requerida: {corrente_referencia} A | "
            f"Critério catálogo: {campo_catalogo} | "
            f"Bobina: {projeto.tensao_comando} / {projeto.tipo_corrente_comando}"
        )

        _pendencia_contatora(
            projeto,
            carga,
            descricao=descricao,
            memoria_calculo=memoria_calculo,
            corrente_referencia_a=corrente_referencia,
            observacoes=observacoes,
            indice_escopo=0,
        )
        print("[CONTATORAS] Pendência criada: nenhuma contatora compatível.")
        return []

    produto_selecionado = opcoes_lista[0]
    print(f"[CONTATORAS] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        carga=carga,
        indice_escopo=0,
        defaults={
            "produto": produto_selecionado,
            "quantidade": quantidade_contatora,
            "corrente_referencia_a": corrente_referencia,
            "memoria_calculo": memoria_calculo,
            "status": StatusSugestaoChoices.PENDENTE,
            "ordem": 40,
        },
    )

    print(
        f"[CONTATORAS] Sugestão salva: id={sugestao.id} | created={created} | produto={sugestao.produto}"
    )
    return [sugestao]


def reprocessar_contatora_para_carga(projeto, carga) -> List[SugestaoItem]:
    """Remove sugestão/pendência só desta carga e recalcula (reavaliação de pendência)."""
    _validar_projeto_contatora(projeto)
    _limpar_escopo_contatora_carga(projeto, carga)
    return processar_sugestao_contatora_para_carga(projeto, carga)


def gerar_sugestoes_contatoras(projeto):
    """
    Gera sugestões de contatoras para todas as cargas ativas do projeto.

    MOTOR: contatora(s) só para partida DIRETA ou ESTRELA_TRIANGULO.
    RESISTENCIA: só se tipo_acionamento for CONTATOR.
    VALVULA: CONTATOR com AC-3 ≥ corrente consumida (mA→A); quantidade = solenoides.

    Remove antes todas as sugestões/pendências de contatora do projeto.
    """
    print("\n" + "=" * 100)
    print("[CONTATORAS] Iniciando gerar_sugestoes_contatoras")
    print(f"[CONTATORAS] Projeto: id={projeto.id} | projeto={projeto}")

    _validar_projeto_contatora(projeto)

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
    ).delete()
    print(f"[CONTATORAS] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
    ).delete()
    print(f"[CONTATORAS] Pendências antigas removidas: {deletados_pendencias}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
    )

    print(f"[CONTATORAS] Total de cargas encontradas: {cargas.count()}")

    sugestoes_criadas = executar_com_savepoint_por_carga_lista(
        projeto,
        cargas,
        "[CONTATORAS]",
        processar_sugestao_contatora_para_carga,
    )

    print("-" * 100)
    print(f"[CONTATORAS] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[CONTATORAS] Finalizando gerar_sugestoes_contatoras")
    print("=" * 100 + "\n")

    return sugestoes_criadas
