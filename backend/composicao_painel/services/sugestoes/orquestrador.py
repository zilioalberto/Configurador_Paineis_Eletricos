from django.db import transaction
from django.core.exceptions import ValidationError

from composicao_painel.models import SugestaoItem
from composicao_painel.services.sugestoes.seccionadoras import (
    gerar_sugestao_seccionamento,
)
from composicao_painel.services.sugestoes.contatoras import (
    gerar_sugestoes_contatoras,
)
from composicao_painel.services.sugestoes.disjuntores_motor import (
    gerar_sugestoes_disjuntores_motor,
)

from cargas.models import CargaMotor
from core.choices.cargas import TipoProtecaoMotorChoices


ETAPAS_GERACAO_BASE = [
    ("SECCIONAMENTO", gerar_sugestao_seccionamento),
    ("CONTATORAS", gerar_sugestoes_contatoras),
]


def limpar_sugestoes_projeto(projeto):
    print(f"[ORQUESTRADOR] Limpando sugestões do projeto {projeto.id}")
    deletados, _ = SugestaoItem.objects.filter(projeto=projeto).delete()
    print(f"[ORQUESTRADOR] Registros removidos: {deletados}")


def projeto_tem_motor_com_disjuntor_motor(projeto) -> bool:
    """
    Verifica se existe ao menos um motor do projeto cuja proteção
    seja DISJUNTOR_MOTOR.
    """
    existe = CargaMotor.objects.filter(
        carga__projeto=projeto,
        tipo_protecao=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_motor_com_disjuntor_motor = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def montar_etapas_geracao(projeto):
    """
    Monta dinamicamente a lista de etapas a executar para o projeto.
    """
    etapas = list(ETAPAS_GERACAO_BASE)

    if projeto_tem_motor_com_disjuntor_motor(projeto):
        etapas.append(
            ("DISJUNTORES_MOTOR", gerar_sugestoes_disjuntores_motor)
        )

    print("[ORQUESTRADOR] Etapas montadas:")
    for nome_etapa, _ in etapas:
        print(f" - {nome_etapa}")

    return etapas


@transaction.atomic
def gerar_sugestoes_painel(projeto, limpar_antes=False):
    print("\n" + "=" * 100)
    print("[ORQUESTRADOR] Iniciando gerar_sugestoes_painel")

    if projeto is None:
        raise ValidationError("Projeto não informado.")

    print(f"[ORQUESTRADOR] Projeto recebido: id={projeto.id} | projeto={projeto}")
    print(f"[ORQUESTRADOR] limpar_antes = {limpar_antes}")

    if limpar_antes:
        limpar_sugestoes_projeto(projeto)

    sugestoes_geradas = []
    erros = []

    etapas = montar_etapas_geracao(projeto)

    for nome_etapa, funcao_geradora in etapas:
        print("-" * 100)
        print(f"[ORQUESTRADOR] Executando etapa: {nome_etapa}")

        try:
            resultado = funcao_geradora(projeto)

            if resultado is None:
                print(f"[ORQUESTRADOR] Etapa {nome_etapa} retornou None")
                continue

            if isinstance(resultado, list):
                print(
                    f"[ORQUESTRADOR] Etapa {nome_etapa} retornou lista com "
                    f"{len(resultado)} item(ns)"
                )
                sugestoes_geradas.extend(resultado)
            else:
                print(f"[ORQUESTRADOR] Etapa {nome_etapa} retornou item único")
                sugestoes_geradas.append(resultado)

        except Exception as exc:
            print(f"[ORQUESTRADOR] Erro na etapa {nome_etapa}: {exc}")
            erros.append(
                {
                    "etapa": nome_etapa,
                    "erro": str(exc),
                }
            )

    resultado_final = {
        "projeto_id": projeto.id,
        "total_sugestoes": len(sugestoes_geradas),
        "sugestoes": sugestoes_geradas,
        "erros": erros,
    }

    print("-" * 100)
    print(f"[ORQUESTRADOR] Resultado final: {resultado_final}")
    print("[ORQUESTRADOR] Finalizando gerar_sugestoes_painel")
    print("=" * 100 + "\n")

    return resultado_final