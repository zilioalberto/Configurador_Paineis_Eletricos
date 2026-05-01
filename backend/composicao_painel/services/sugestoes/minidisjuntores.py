from typing import Optional

from cargas.models import Carga, CargaMotor, CargaResistencia
from catalogo.selectors.minidisjuntor import selecionar_minidisjuntores
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from core.choices import (
    NumeroFasesChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import (
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.produtos import CurvaDisparoMiniDisjuntorChoices, NumeroPolosChoices


def _numero_polos_para_fases(numero_fases: int) -> Optional[str]:
    """Alinha polos do minidisjuntor ao número de fases da carga (ex.: 3 → 3P)."""
    m = {
        int(NumeroFasesChoices.MONOFASICO): NumeroPolosChoices.P1,
        int(NumeroFasesChoices.BIFASICO): NumeroPolosChoices.P2,
        int(NumeroFasesChoices.TRIFASICO): NumeroPolosChoices.P3,
    }
    return m.get(int(numero_fases))


def _limpar_escopo_minidisjuntores_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        carga=carga,
    ).delete()


def processar_sugestao_minidisjuntores_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Sugestão de minidisjuntor (catálogo MINIDISJUNTOR) para carga MOTOR ou
    RESISTENCIA quando a proteção for MINIDISJUNTOR.

    Critérios: ``numero_polos`` da especificação igual ao número de fases da
    carga (1→1P, 2→2P, 3→3P), ``corrente_nominal_a`` estritamente superior
    a ``corrente_calculada_a`` e, para MOTOR, ``curva_disparo = C``.
    """
    print("-" * 100)
    print(f"[MINIDISJUNTOR] Processando carga: id={carga.id} | carga={carga}")

    corrente_referencia = None
    numero_fases = None
    memoria_tipo = ""

    if carga.tipo == TipoCargaChoices.MOTOR:
        try:
            carga_motor = CargaMotor.objects.get(carga=carga)
        except CargaMotor.DoesNotExist:
            descricao = (
                "Carga do tipo MOTOR sem registro correspondente em CargaMotor."
            )
            memoria_calculo = (
                f"[MINIDISJUNTOR]\n"
                f"Carga: {carga}\n"
                f"Motivo: registro CargaMotor não encontrado."
            )
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )
            return None

        if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.MINIDISJUNTOR:
            _limpar_escopo_minidisjuntores_carga(projeto, carga)
            print(
                "[MINIDISJUNTOR] Proteção do motor diferente de MINIDISJUNTOR. Pulando."
            )
            return None

        corrente_referencia = carga_motor.corrente_calculada_a
        numero_fases = carga_motor.numero_fases
        memoria_tipo = f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"

    elif carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            carga_resistencia = CargaResistencia.objects.get(carga=carga)
        except CargaResistencia.DoesNotExist:
            descricao = (
                "Carga do tipo RESISTENCIA sem registro em CargaResistencia."
            )
            memoria_calculo = (
                f"[MINIDISJUNTOR]\n"
                f"Carga: {carga}\n"
                f"Motivo: registro CargaResistencia não encontrado."
            )
            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )
            return None

        if (
            carga_resistencia.tipo_protecao
            != TipoProtecaoResistenciaChoices.MINIDISJUNTOR
        ):
            _limpar_escopo_minidisjuntores_carga(projeto, carga)
            print(
                "[MINIDISJUNTOR] Proteção da resistência diferente de "
                "MINIDISJUNTOR. Pulando."
            )
            return None

        corrente_referencia = carga_resistencia.corrente_calculada_a
        numero_fases = carga_resistencia.numero_fases
        memoria_tipo = (
            f"Tipo de proteção da resistência: {carga_resistencia.tipo_protecao}\n"
        )

    else:
        print("[MINIDISJUNTOR] Tipo de carga não tratado. Pulando.")
        return None

    numero_polos = (
        _numero_polos_para_fases(numero_fases) if numero_fases is not None else None
    )
    if not numero_polos:
        descricao = (
            "Número de fases da carga não permite mapear polos do minidisjuntor."
        )
        memoria_calculo = (
            f"[MINIDISJUNTOR]\n"
            f"Carga: {carga}\n"
            f"{memoria_tipo}"
            f"numero_fases informado: {numero_fases}\n"
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_referencia,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )
        return None

    if corrente_referencia is None:
        descricao = (
            "Corrente calculada não encontrada para seleção do minidisjuntor."
        )
        memoria_calculo = (
            f"[MINIDISJUNTOR]\n"
            f"Carga: {carga}\n"
            f"{memoria_tipo}"
            f"Motivo: corrente_calculada_a ausente."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )
        return None

    sel_kwargs = dict(
        corrente_nominal=corrente_referencia,
        modo_montagem=None,
        numero_polos=numero_polos,
        niveis=1,
        superior_a_corrente=True,
    )
    if carga.tipo == TipoCargaChoices.MOTOR:
        sel_kwargs["curva_disparo"] = CurvaDisparoMiniDisjuntorChoices.C

    opcoes = selecionar_minidisjuntores(**sel_kwargs)
    opcoes_lista = list(opcoes)

    linha_curva = ""
    if carga.tipo == TipoCargaChoices.MOTOR:
        linha_curva = (
            f"Curva de disparo: {CurvaDisparoMiniDisjuntorChoices.C.label} "
            "(obrigatória para carga motor)\n"
        )

    memoria_calculo = (
        f"[MINIDISJUNTOR]\n"
        f"Carga: {carga}\n"
        f"Tipo de carga: {carga.tipo}\n"
        f"{memoria_tipo}"
        f"Corrente calculada (referência): {corrente_referencia} A\n"
        f"Número de fases: {numero_fases} → polos {numero_polos}\n"
        f"{linha_curva}"
        f"Categoria produto: {CategoriaProdutoNomeChoices.MINIDISJUNTOR}\n"
        f"Critério: corrente_nominal_a > corrente_calculada_a\n"
    )

    if not opcoes_lista:
        descricao = (
            f"Nenhum minidisjuntor compatível encontrado para a carga {carga}."
        )
        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_referencia,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )
        return None

    produto_selecionado = opcoes_lista[0]
    sugestao, _created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
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
    return sugestao


def reprocessar_minidisjuntores_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    _limpar_escopo_minidisjuntores_carga(projeto, carga)
    return processar_sugestao_minidisjuntores_para_carga(projeto, carga)


def gerar_sugestoes_minidisjuntores(projeto):
    """Gera sugestões de minidisjuntor para cargas MOTOR/RESISTENCIA elegíveis."""
    print("\n" + "=" * 100)
    print("[MINIDISJUNTOR] Iniciando gerar_sugestoes_minidisjuntores")

    tipos = [TipoCargaChoices.MOTOR, TipoCargaChoices.RESISTENCIA]

    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        carga__tipo__in=tipos,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        carga__tipo__in=tipos,
    ).delete()

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo__in=tipos,
    )

    sugestoes = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[MINIDISJUNTOR]",
        processar_sugestao_minidisjuntores_para_carga,
    )

    print(
        f"[MINIDISJUNTOR] Total de sugestões: {len(sugestoes)} | "
        f"projeto={projeto.id}"
    )
    print("=" * 100 + "\n")
    return sugestoes
