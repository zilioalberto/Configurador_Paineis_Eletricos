from django.db import transaction
from django.core.exceptions import ValidationError

from composicao_painel.models import ComposicaoItem, SugestaoItem
from composicao_painel.services.sugestoes.seccionadoras import (
    gerar_sugestao_seccionamento,
)
from composicao_painel.services.sugestoes.contatoras import (
    gerar_sugestoes_contatoras,
)
from composicao_painel.services.sugestoes.disjuntores_motor import (
    gerar_sugestoes_disjuntores_motor,
)
from composicao_painel.services.sugestoes.pendencias_sem_regra import (
    sincronizar_pendencias_cargas_sem_regra_catalogo,
)

from cargas.models import Carga, CargaMotor, CargaResistencia
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)


ETAPAS_GERACAO_BASE = [
    ("SECCIONAMENTO", gerar_sugestao_seccionamento),
    ("CONTATORAS", gerar_sugestoes_contatoras),
]


def limpar_sugestoes_projeto(projeto):
    print(f"[ORQUESTRADOR] Limpando sugestões do projeto {projeto.id}")
    deletados, _ = SugestaoItem.objects.filter(projeto=projeto).delete()
    print(f"[ORQUESTRADOR] Registros removidos: {deletados}")


def projeto_precisa_contatoras(projeto) -> bool:
    """
    Indica se o projeto tem cargas que podem gerar sugestão de contatora:
    alguma carga MOTOR, ou resistência com tipo_acionamento CONTATOR.
    """
    tem_motor = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
        tipo=TipoCargaChoices.MOTOR,
    ).exists()
    tem_resistencia_contator = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.RESISTENCIA,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    ).exists()
    existe = tem_motor or tem_resistencia_contator

    print(
        "[ORQUESTRADOR] projeto_precisa_contatoras = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_motor_com_disjuntor_motor(projeto) -> bool:
    """
    Verifica se o projeto exige geração de sugestões de disjuntor motor:
    motor com proteção disjuntor motor ou resistência com tipo_protecao
    DISJUNTOR_MOTOR.
    """
    existe_motor = CargaMotor.objects.filter(
        carga__projeto=projeto,
        tipo_protecao=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    ).exists()
    existe_resistencia = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        tipo_protecao=TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR,
    ).exists()
    existe = existe_motor or existe_resistencia

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


def remover_sugestoes_ja_aprovadas(projeto) -> int:
    """Remove sugestões que já possuem item aprovado na composição."""
    chaves_aprovadas = set(
        ComposicaoItem.objects.filter(projeto=projeto).values_list(
            "parte_painel",
            "categoria_produto",
            "carga_id",
        )
    )
    if not chaves_aprovadas:
        return 0

    sugestoes_ids = [
        sug_id
        for sug_id, parte, categoria, carga_id in SugestaoItem.objects.filter(
            projeto=projeto
        ).values_list("id", "parte_painel", "categoria_produto", "carga_id")
        if (parte, categoria, carga_id) in chaves_aprovadas
    ]
    if not sugestoes_ids:
        return 0

    deletados, _ = SugestaoItem.objects.filter(id__in=sugestoes_ids).delete()
    print(
        "[ORQUESTRADOR] Sugestões descartadas por já estarem aprovadas: "
        f"{deletados}"
    )
    return deletados


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

    total_descartadas_aprovadas = remover_sugestoes_ja_aprovadas(projeto)

    pendencias_sem_regra = sincronizar_pendencias_cargas_sem_regra_catalogo(projeto)

    resultado_final = {
        "projeto_id": projeto.id,
        "total_sugestoes": len(sugestoes_geradas),
        "sugestoes": sugestoes_geradas,
        "erros": erros,
        "sugestoes_descartadas_aprovadas": total_descartadas_aprovadas,
        "pendencias_cargas_sem_regra_catalogo": len(pendencias_sem_regra),
    }

    print("-" * 100)
    print(f"[ORQUESTRADOR] Resultado final: {resultado_final}")
    print("[ORQUESTRADOR] Finalizando gerar_sugestoes_painel")
    print("=" * 100 + "\n")

    return resultado_final