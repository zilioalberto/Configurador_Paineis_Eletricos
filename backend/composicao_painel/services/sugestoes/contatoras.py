from typing import Optional

from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor, CargaResistencia
from composicao_painel.models import SugestaoItem, PendenciaItem
from catalogo.selectors.contatoras import selecionar_contatoras

from core.choices import (
    PartesPainelChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)
from core.choices.cargas import TipoCargaChoices


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


def processar_sugestao_contatora_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    """
    Gera ou atualiza sugestão/pendência de contatora para uma única carga.
    Não remove registros de outras cargas.
    """
    _validar_projeto_contatora(projeto)

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
            descricao = (
                "Carga do tipo MOTOR sem registro correspondente em CargaMotor."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": (
                        f"[CONTATORA]\n"
                        f"Carga: {carga}\n"
                        f"Tipo de carga: {carga.tipo}\n"
                        f"Motivo: registro CargaMotor não encontrado."
                    ),
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 40,
                },
            )
            print("[CONTATORAS] Pendência criada: CargaMotor não encontrada.")
            return None

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
            descricao = (
                "Carga do tipo RESISTENCIA sem registro correspondente em CargaResistencia."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": (
                        f"[CONTATORA]\n"
                        f"Carga: {carga}\n"
                        f"Tipo de carga: {carga.tipo}\n"
                        f"Motivo: registro CargaResistencia não encontrado."
                    ),
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 40,
                },
            )
            print("[CONTATORAS] Pendência criada: CargaResistencia não encontrada.")
            return None

        corrente_referencia = carga_resistencia.corrente_calculada_a
        campo_catalogo = "corrente_ac1_a"

    else:
        print(
            f"[CONTATORAS] Tipo de carga {carga.tipo} não tratado para contatora. Pulando."
        )
        return None

    print(f"[CONTATORAS] Corrente de referência: {corrente_referencia}")
    print(f"[CONTATORAS] Campo do catálogo: {campo_catalogo}")
    print(f"[CONTATORAS] Tensão bobina requerida: {projeto.tensao_comando}")
    print(
        f"[CONTATORAS] Tipo corrente bobina requerido: {projeto.tipo_corrente_comando}"
    )

    if corrente_referencia is None:
        descricao = "Corrente de referência não calculada para seleção da contatora."

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": None,
                "memoria_calculo": (
                    f"[CONTATORA]\n"
                    f"Carga: {carga}\n"
                    f"Tipo de carga: {carga.tipo}\n"
                    f"Motivo: corrente de referência não encontrada."
                ),
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 40,
            },
        )
        print("[CONTATORAS] Pendência criada: corrente de referência ausente.")
        return None

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

    if not opcoes_lista:
        descricao = (
            f"Nenhuma contatora compatível encontrada para a carga {carga}."
        )
        observacoes = (
            f"Corrente requerida: {corrente_referencia} A | "
            f"Critério catálogo: {campo_catalogo} | "
            f"Bobina: {projeto.tensao_comando} / {projeto.tipo_corrente_comando}"
        )

        PendenciaItem.objects.update_or_create(
            projeto=projeto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
            carga=carga,
            defaults={
                "descricao": descricao,
                "corrente_referencia_a": corrente_referencia,
                "memoria_calculo": memoria_calculo,
                "observacoes": observacoes,
                "status": StatusPendenciaChoices.ABERTA,
                "ordem": 40,
            },
        )
        print("[CONTATORAS] Pendência criada: nenhuma contatora compatível.")
        return None

    produto_selecionado = opcoes_lista[0]
    print(f"[CONTATORAS] Produto selecionado: {produto_selecionado}")

    sugestao, created = SugestaoItem.objects.update_or_create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
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
    return sugestao


def reprocessar_contatora_para_carga(projeto, carga) -> Optional[SugestaoItem]:
    """Remove sugestão/pendência só desta carga e recalcula (reavaliação de pendência)."""
    _validar_projeto_contatora(projeto)
    _limpar_escopo_contatora_carga(projeto, carga)
    return processar_sugestao_contatora_para_carga(projeto, carga)


def gerar_sugestoes_contatoras(projeto):
    """
    Gera sugestões de contatoras para todas as cargas ativas do projeto.
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

    sugestoes_criadas = []

    for carga in cargas:
        sugestao = processar_sugestao_contatora_para_carga(projeto, carga)
        if sugestao is not None:
            sugestoes_criadas.append(sugestao)

    print("-" * 100)
    print(f"[CONTATORAS] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[CONTATORAS] Finalizando gerar_sugestoes_contatoras")
    print("=" * 100 + "\n")

    return sugestoes_criadas
