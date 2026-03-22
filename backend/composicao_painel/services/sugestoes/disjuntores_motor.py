from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor
from composicao_painel.models import SugestaoItem

from catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor

from core.choices import PartesPainelChoices, StatusSugestaoChoices
from core.choices.cargas import TipoCargaChoices, TipoProtecaoMotorChoices


def gerar_sugestoes_disjuntores_motor(projeto):
    """
    Gera sugestões de disjuntores motor para as cargas do projeto.

    Regras:
    - somente cargas do tipo MOTOR
    - somente quando carga_motor.tipo_protecao == DISJUNTOR_MOTOR
    - usa carga_motor.corrente_calculada_a como referência
    - seleciona no catálogo pela faixa de ajuste compatível

    Retorno:
    - lista de SugestaoItem geradas
    """

    print("\n" + "=" * 100)
    print("[DISJUNTORES MOTOR] Iniciando gerar_sugestoes_disjuntores_motor")
    print(f"[DISJUNTORES MOTOR] Projeto: id={projeto.id} | projeto={projeto}")

    deletados, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
    ).filter(
        carga__tipo=TipoCargaChoices.MOTOR
    ).delete()
    print(f"[DISJUNTORES MOTOR] Sugestões antigas removidas: {deletados}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    )

    print(f"[DISJUNTORES MOTOR] Total de cargas MOTOR encontradas: {cargas.count()}")

    sugestoes_criadas = []

    for carga in cargas:
        print("-" * 100)
        print(f"[DISJUNTORES MOTOR] Processando carga: id={carga.id} | carga={carga}")

        try:
            carga_motor = CargaMotor.objects.get(carga=carga)
            print(f"[DISJUNTORES MOTOR] CargaMotor encontrada: id={carga_motor.id}")
        except CargaMotor.DoesNotExist:
            print("[DISJUNTORES MOTOR] CargaMotor não encontrada. Pulando carga.")
            continue

        print(f"[DISJUNTORES MOTOR] Tipo proteção: {carga_motor.tipo_protecao}")

        if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.DISJUNTOR_MOTOR:
            print(
                "[DISJUNTORES MOTOR] Tipo de proteção diferente de DISJUNTOR_MOTOR. Pulando carga."
            )
            continue

        corrente_referencia = carga_motor.corrente_calculada_a
        print(f"[DISJUNTORES MOTOR] Corrente de referência: {corrente_referencia}")

        if corrente_referencia is None:
            print("[DISJUNTORES MOTOR] Corrente calculada não encontrada. Pulando carga.")
            continue

        opcoes = selecionar_disjuntores_motor(
            corrente_nominal=corrente_referencia,
            modo_montagem=None,
            niveis=1,
        )

        opcoes_lista = list(opcoes)
        print(
            f"[DISJUNTORES MOTOR] Quantidade de opções retornadas pelo selector: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            print("[DISJUNTORES MOTOR] Nenhum disjuntor motor compatível encontrado.")
            continue

        produto_selecionado = opcoes_lista[0]
        print(f"[DISJUNTORES MOTOR] Produto selecionado: {produto_selecionado}")

        memoria_calculo = (
            f"[DISJUNTOR MOTOR]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
            f"Corrente de referência: {corrente_referencia} A\n"
            f"Critério: faixa_ajuste_min_a <= corrente <= faixa_ajuste_max_a\n"
            f"Regra de ordenação: maior sobra superior\n"
            f"Critério final: primeiro item compatível retornado pelo selector"
        )

        sugestao, created = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
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

        sugestoes_criadas.append(sugestao)

    print("-" * 100)
    print(f"[DISJUNTORES MOTOR] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[DISJUNTORES MOTOR] Finalizando gerar_sugestoes_disjuntores_motor")
    print("=" * 100 + "\n")

    return sugestoes_criadas