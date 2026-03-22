from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor, CargaResistencia
from composicao_painel.models import SugestaoItem
from catalogo.selectors.contatoras import selecionar_contatoras

from core.choices import PartesPainelChoices, StatusSugestaoChoices
from core.choices.cargas import TipoCargaChoices


def gerar_sugestoes_contatoras(projeto):
    """
    Gera sugestões de contatoras para as cargas do projeto.

    Regras:
    - MOTOR -> seleção por corrente AC3
    - RESISTENCIA -> seleção por corrente AC1
    - A bobina deve ser compatível com:
        - projeto.tensao_comando
        - projeto.tipo_corrente_comando

    Retorno:
    - lista de SugestaoItem geradas
    """

    print("\n" + "=" * 100)
    print("[CONTATORAS] Iniciando gerar_sugestoes_contatoras")
    print(f"[CONTATORAS] Projeto: id={projeto.id} | projeto={projeto}")

    if not projeto.tensao_comando:
        raise ValidationError("Projeto sem tensao_comando definida.")

    if not projeto.tipo_corrente_comando:
        raise ValidationError("Projeto sem tipo_corrente_comando definido.")

    deletados, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
    ).delete()
    print(f"[CONTATORAS] Sugestões antigas removidas: {deletados}")

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
    )

    print(f"[CONTATORAS] Total de cargas encontradas: {cargas.count()}")

    sugestoes_criadas = []

    for carga in cargas:
        print("-" * 100)
        print(f"[CONTATORAS] Processando carga: id={carga.id} | carga={carga}")
        print(f"[CONTATORAS] Tipo da carga: {carga.tipo}")

        corrente_referencia = None
        campo_catalogo = None

        if carga.tipo == TipoCargaChoices.MOTOR:
            print("[CONTATORAS] Carga do tipo MOTOR")

            try:
                carga_motor = CargaMotor.objects.get(carga=carga)
                print(f"[CONTATORAS] CargaMotor encontrada: id={carga_motor.id}")
            except CargaMotor.DoesNotExist:
                print("[CONTATORAS] CargaMotor não encontrada. Pulando carga.")
                continue

            corrente_referencia = carga_motor.corrente_calculada_a
            campo_catalogo = "corrente_ac3_a"

        elif carga.tipo == TipoCargaChoices.RESISTENCIA:
            print("[CONTATORAS] Carga do tipo RESISTENCIA")

            try:
                carga_resistencia = CargaResistencia.objects.get(carga=carga)
                print(
                    f"[CONTATORAS] CargaResistencia encontrada: id={carga_resistencia.id}"
                )
            except CargaResistencia.DoesNotExist:
                print("[CONTATORAS] CargaResistencia não encontrada. Pulando carga.")
                continue

            corrente_referencia = carga_resistencia.corrente_calculada_a
            campo_catalogo = "corrente_ac1_a"

        else:
            print(
                f"[CONTATORAS] Tipo de carga {carga.tipo} não tratado para contatora. Pulando."
            )
            continue

        print(f"[CONTATORAS] Corrente de referência: {corrente_referencia}")
        print(f"[CONTATORAS] Campo do catálogo: {campo_catalogo}")
        print(f"[CONTATORAS] Tensão bobina requerida: {projeto.tensao_comando}")
        print(
            f"[CONTATORAS] Tipo corrente bobina requerido: {projeto.tipo_corrente_comando}"
        )

        if corrente_referencia is None:
            print("[CONTATORAS] Corrente de referência não encontrada. Pulando carga.")
            continue

        opcoes = selecionar_contatoras(
            tipo_carga=carga.tipo,
            corrente_nominal=corrente_referencia,
            tensao_comando=projeto.tensao_comando,
            tipo_corrente_comando=projeto.tipo_corrente_comando,
            modo_montagem=None,
            niveis=1,
        )

        opcoes_lista = list(opcoes)
        print(
            f"[CONTATORAS] Quantidade de opções retornadas pelo selector: {len(opcoes_lista)}"
        )

        if not opcoes_lista:
            print("[CONTATORAS] Nenhuma contatora compatível encontrada.")
            continue

        produto_selecionado = opcoes_lista[0]
        print(f"[CONTATORAS] Produto selecionado: {produto_selecionado}")

        memoria_calculo = (
            f"[CONTATORA]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
            f"Corrente de referência: {corrente_referencia} A\n"
            f"Campo do catálogo considerado: {campo_catalogo}\n"
            f"Tensão bobina requerida: {projeto.tensao_comando} V\n"
            f"Tipo de corrente bobina requerida: {projeto.tipo_corrente_comando}\n"
            f"Critério final: menor item compatível"
        )

        sugestao, created = SugestaoItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            carga=carga,
            defaults={
                "produto": produto_selecionado,
                "quantidade": 1,
                "corrente_referencia_a": corrente_referencia,
                "memoria_calculo": memoria_calculo,
                "status": StatusSugestaoChoices.PENDENTE,
                "ordem": 40,
            },
        )

        print(
            f"[CONTATORAS] Sugestão salva: id={sugestao.id} | created={created} | produto={sugestao.produto}"
        )

        sugestoes_criadas.append(sugestao)

    print("-" * 100)
    print(f"[CONTATORAS] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[CONTATORAS] Finalizando gerar_sugestoes_contatoras")
    print("=" * 100 + "\n")

    return sugestoes_criadas