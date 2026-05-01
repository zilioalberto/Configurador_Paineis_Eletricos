from typing import Optional

from cargas.models import Carga, CargaMotor
from catalogo.selectors.fusiveis import selecionar_fusiveis
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoProtecaoMotorChoices
from core.choices.produtos import TipoFusivelChoices


def _limpar_escopo_fusivel_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        carga=carga,
    ).delete()


def processar_sugestao_fusivel_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    """
    Gera ou atualiza sugestão/pendência de fusível para uma carga MOTOR quando
    CargaMotor.tipo_protecao for FUSIVEL.
    """
    print("-" * 100)
    print(f"[FUSIVEL] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo != TipoCargaChoices.MOTOR:
        print("[FUSIVEL] Tipo de carga não tratado para fusível. Pulando.")
        return None

    try:
        carga_motor = CargaMotor.objects.get(carga=carga)
        print(f"[FUSIVEL] CargaMotor encontrada: id={carga_motor.id}")
    except CargaMotor.DoesNotExist:
        descricao = "Carga do tipo MOTOR sem registro correspondente em CargaMotor."

        memoria_calculo = (
            f"[FUSIVEL]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Motivo: registro CargaMotor não encontrado."
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print("[FUSIVEL] Pendência criada: CargaMotor não encontrada.")
        return None

    print(f"[FUSIVEL] Tipo proteção: {carga_motor.tipo_protecao}")

    if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.FUSIVEL:
        _limpar_escopo_fusivel_carga(projeto, carga)
        print("[FUSIVEL] Tipo de proteção diferente de FUSIVEL. Pulando carga.")
        return None

    corrente_referencia = carga_motor.corrente_calculada_a
    print(f"[FUSIVEL] Corrente de referência: {corrente_referencia}")

    if corrente_referencia is None:
        descricao = "Corrente calculada não encontrada para seleção do fusível."

        memoria_calculo = (
            f"[FUSIVEL]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
            f"Motivo: corrente_calculada_a não encontrada."
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print("[FUSIVEL] Pendência criada: corrente calculada ausente.")
        return None

    opcoes = selecionar_fusiveis(
        corrente_nominal_maior_que_a=corrente_referencia,
        tipo_fusivel=TipoFusivelChoices.RETARDADO,
    )

    opcoes_lista = list(opcoes)
    print(
        f"[FUSIVEL] Quantidade de opções retornadas pelo selector: "
        f"{len(opcoes_lista)}"
    )

    memoria_calculo = (
        f"[FUSIVEL]\n"
        f"Carga: {carga}\n"
        f"Tipo de carga: {carga.tipo}\n"
        f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
        f"Corrente de referência: {corrente_referencia} A\n"
        f"Tipo de fusível requerido: {TipoFusivelChoices.RETARDADO}\n"
        f"Critério: corrente_nominal_a > corrente_calculada_a\n"
        f"Regra de ordenação: menor corrente nominal compatível\n"
        f"Critério final: primeiro item compatível retornado pelo selector"
    )

    if not opcoes_lista:
        descricao = f"Nenhum fusível retardado compatível encontrado para a carga {carga}."

        observacoes = (
            f"Corrente requerida: > {corrente_referencia} A | "
            f"Tipo de fusível: {TipoFusivelChoices.RETARDADO}"
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
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

        print("[FUSIVEL] Pendência criada: nenhum fusível compatível encontrado.")
        return None

    produto_selecionado = opcoes_lista[0]
    print(f"[FUSIVEL] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
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
        f"[FUSIVEL] Sugestão salva: id={sugestao.id} | "
        f"created={created} | produto={sugestao.produto}"
    )

    return sugestao


def reprocessar_fusivel_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    """Remove sugestão/pendência só desta carga e recalcula."""
    _limpar_escopo_fusivel_carga(projeto, carga)
    return processar_sugestao_fusivel_para_carga(projeto, carga)


def gerar_sugestoes_fusiveis(projeto):
    """
    Gera sugestões de fusíveis para cargas MOTOR.

    Só gera sugestão quando CargaMotor.tipo_protecao for FUSIVEL.
    Percorre todas as cargas MOTOR ativas para aplicar limpeza quando a proteção
    deixa de ser fusível.
    """
    print("\n" + "=" * 100)
    print("[FUSIVEL] Iniciando gerar_sugestoes_fusiveis")
    print(f"[FUSIVEL] Projeto: id={projeto.id} | projeto={projeto}")

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[FUSIVEL] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[FUSIVEL] Pendências antigas removidas: {deletados_pendencias}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    )

    print(f"[FUSIVEL] Total de cargas elegíveis: {cargas.count()}")

    sugestoes_criadas = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[FUSIVEL]",
        processar_sugestao_fusivel_para_carga,
    )

    print("-" * 100)
    print(f"[FUSIVEL] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[FUSIVEL] Finalizando gerar_sugestoes_fusiveis")
    print("=" * 100 + "\n")

    return sugestoes_criadas
