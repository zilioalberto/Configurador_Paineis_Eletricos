from typing import Optional

from cargas.models import Carga, CargaMotor
from catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
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


def _limpar_escopo_rele_sobrecarga_carga(projeto, carga) -> None:
    SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        carga=carga,
    ).delete()
    PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        carga=carga,
    ).delete()


def processar_sugestao_rele_sobrecarga_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """
    Gera ou atualiza sugestão/pendência de relé de sobrecarga para uma carga MOTOR
    quando CargaMotor.tipo_protecao for RELE_SOBRECARGA.
    """
    print("-" * 100)
    print(f"[RELE SOBRECARGA] Processando carga: id={carga.id} | carga={carga}")

    if carga.tipo != TipoCargaChoices.MOTOR:
        print(
            "[RELE SOBRECARGA] Tipo de carga não tratado para relé de sobrecarga. "
            "Pulando."
        )
        return None

    try:
        carga_motor = CargaMotor.objects.get(carga=carga)
        print(f"[RELE SOBRECARGA] CargaMotor encontrada: id={carga_motor.id}")
    except CargaMotor.DoesNotExist:
        descricao = "Carga do tipo MOTOR sem registro correspondente em CargaMotor."

        memoria_calculo = (
            f"[RELE SOBRECARGA]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Motivo: registro CargaMotor não encontrado."
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print("[RELE SOBRECARGA] Pendência criada: CargaMotor não encontrada.")
        return None

    print(f"[RELE SOBRECARGA] Tipo proteção: {carga_motor.tipo_protecao}")

    if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.RELE_SOBRECARGA:
        _limpar_escopo_rele_sobrecarga_carga(projeto, carga)
        print(
            "[RELE SOBRECARGA] Tipo de proteção diferente de RELE_SOBRECARGA. "
            "Pulando carga."
        )
        return None

    corrente_referencia = carga_motor.corrente_calculada_a
    print(f"[RELE SOBRECARGA] Corrente de referência: {corrente_referencia}")

    if corrente_referencia is None:
        descricao = "Corrente calculada não encontrada para seleção do relé de sobrecarga."

        memoria_calculo = (
            f"[RELE SOBRECARGA]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
            f"Motivo: corrente_calculada_a não encontrada."
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": memoria_calculo,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 30,
            },
        )

        print("[RELE SOBRECARGA] Pendência criada: corrente calculada ausente.")
        return None

    opcoes = selecionar_reles_sobrecarga(
        corrente_nominal=corrente_referencia,
        modo_montagem=None,
        niveis=1,
    )

    opcoes_lista = list(opcoes)
    print(
        f"[RELE SOBRECARGA] Quantidade de opções retornadas pelo selector: "
        f"{len(opcoes_lista)}"
    )

    memoria_calculo = (
        f"[RELE SOBRECARGA]\n"
        f"Carga: {carga}\n"
        f"Tipo de carga: {carga.tipo}\n"
        f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
        f"Corrente de referência: {corrente_referencia} A\n"
        f"Critério: faixa_ajuste_min_a <= corrente <= faixa_ajuste_max_a\n"
        f"Regra de ordenação: maior sobra superior\n"
        f"Critério final: primeiro item compatível retornado pelo selector"
    )

    if not opcoes_lista:
        descricao = (
            f"Nenhum relé de sobrecarga compatível encontrado para a carga {carga}."
        )

        observacoes = (
            f"Corrente requerida: {corrente_referencia} A | "
            f"Tipo de proteção: {carga_motor.tipo_protecao}"
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
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
            "[RELE SOBRECARGA] Pendência criada: nenhum relé compatível encontrado."
        )
        return None

    produto_selecionado = opcoes_lista[0]
    print(f"[RELE SOBRECARGA] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
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
        f"[RELE SOBRECARGA] Sugestão salva: id={sugestao.id} | "
        f"created={created} | produto={sugestao.produto}"
    )

    return sugestao


def reprocessar_rele_sobrecarga_para_carga(
    projeto, carga
) -> Optional[SugestaoItem]:
    """Remove sugestão/pendência só desta carga e recalcula."""
    _limpar_escopo_rele_sobrecarga_carga(projeto, carga)
    return processar_sugestao_rele_sobrecarga_para_carga(projeto, carga)


def gerar_sugestoes_reles_sobrecarga(projeto):
    """
    Gera sugestões de relés de sobrecarga para cargas MOTOR.

    Só gera sugestão quando CargaMotor.tipo_protecao for RELE_SOBRECARGA.
    Percorre todas as cargas MOTOR ativas para aplicar limpeza quando a proteção
    deixa de ser relé de sobrecarga.
    """
    print("\n" + "=" * 100)
    print("[RELE SOBRECARGA] Iniciando gerar_sugestoes_reles_sobrecarga")
    print(f"[RELE SOBRECARGA] Projeto: id={projeto.id} | projeto={projeto}")

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Sugestões antigas removidas: {deletados_sugestoes}")

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Pendências antigas removidas: {deletados_pendencias}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    )

    print(f"[RELE SOBRECARGA] Total de cargas elegíveis: {cargas.count()}")

    sugestoes_criadas = executar_com_savepoint_por_carga(
        projeto,
        cargas,
        "[RELE SOBRECARGA]",
        processar_sugestao_rele_sobrecarga_para_carga,
    )

    print("-" * 100)
    print(f"[RELE SOBRECARGA] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[RELE SOBRECARGA] Finalizando gerar_sugestoes_reles_sobrecarga")
    print("=" * 100 + "\n")

    return sugestoes_criadas
