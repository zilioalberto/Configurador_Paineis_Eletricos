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
from composicao_painel.services.sugestoes.rele_sobrecarga import (
    gerar_sugestoes_reles_sobrecarga,
)
from composicao_painel.services.sugestoes.fusivel import (
    gerar_sugestoes_fusiveis,
)
from composicao_painel.services.sugestoes.minidisjuntores import (
    gerar_sugestoes_minidisjuntores,
)
from composicao_painel.services.sugestoes.soft_starter import (
    gerar_sugestoes_soft_starters,
)
from composicao_painel.services.sugestoes.inversores_frequencia import (
    gerar_sugestoes_inversores_frequencia,
)
from composicao_painel.services.sugestoes.reles_estado_solido import (
    gerar_sugestoes_reles_estado_solido,
)
from composicao_painel.services.sugestoes.reles_interface import (
    gerar_sugestoes_reles_interface,
)
from composicao_painel.services.sugestoes.bornes import (
    gerar_sugestoes_bornes,
)
from composicao_painel.services.sugestoes.pendencias_sem_regra import (
    sincronizar_pendencias_cargas_sem_regra_catalogo,
)

from cargas.models import Carga, CargaMotor, CargaResistencia, CargaValvula
from core.choices import NumeroFasesChoices
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
    TipoProtecaoValvulaChoices,
)


ETAPAS_GERACAO_BASE = [
    ("SECCIONAMENTO", gerar_sugestao_seccionamento),
    ("CONTATORAS", gerar_sugestoes_contatoras),
]


def limpar_sugestoes_projeto(projeto):
    print(f"[ORQUESTRADOR] Limpando sugestões do projeto {projeto.id}")
    deletados, _ = SugestaoItem.objects.filter(projeto=projeto).delete()
    print(f"[ORQUESTRADOR] Registros removidos: {deletados}")


def projeto_tem_valvula_com_sugestao_borne(projeto) -> bool:
    """
    Válvula ativa cuja proteção gera sugestão de borne: borne-fusível,
    sem proteção (passagem) ou minidisjuntor (passagem).
    """
    existe = CargaValvula.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.VALVULA,
        tipo_protecao__in=(
            TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
            TipoProtecaoValvulaChoices.SEM_PROTECAO,
            TipoProtecaoValvulaChoices.MINIDISJUNTOR,
        ),
    ).exists()
    print(
        "[ORQUESTRADOR] projeto_tem_valvula_com_sugestao_borne = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_carga_com_rele_interface(projeto) -> bool:
    """Válvula ou resistência com acionamento por relé de interface (catálogo)."""
    tem_valvula = CargaValvula.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.VALVULA,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
    ).exists()
    tem_resistencia = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.RESISTENCIA,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_INTERFACE,
    ).exists()
    existe = tem_valvula or tem_resistencia
    print(
        "[ORQUESTRADOR] projeto_tem_carga_com_rele_interface = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_resistencia_com_rele_estado_solido(projeto) -> bool:
    """Resistência ativa com acionamento por relé de estado sólido."""
    existe = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.RESISTENCIA,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_resistencia_com_rele_estado_solido = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_precisa_contatoras(projeto) -> bool:
    """
    Indica se o projeto tem cargas que podem gerar sugestão de contatora:
    motor com partida DIRETA ou ESTRELA_TRIANGULO, resistência com
    tipo_acionamento CONTATOR, ou válvula com tipo_acionamento CONTATOR.
    """
    tem_motor = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_partida__in=(
            TipoPartidaMotorChoices.DIRETA,
            TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
        ),
    ).exists()
    tem_resistencia_contator = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.RESISTENCIA,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    ).exists()
    tem_valvula_contator = CargaValvula.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.VALVULA,
        tipo_acionamento=TipoAcionamentoValvulaChoices.CONTATOR,
    ).exists()
    existe = tem_motor or tem_resistencia_contator or tem_valvula_contator

    print(
        "[ORQUESTRADOR] projeto_precisa_contatoras = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_motor_soft_starter_trifasico(projeto) -> bool:
    """Motor trifásico com partida soft starter (candidato a sugestão de SS)."""
    existe = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_motor_soft_starter_trifasico = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_motor_inversor_frequencia(projeto) -> bool:
    """Motor com partida por inversor de frequência."""
    existe = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_motor_inversor_frequencia = "
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


def projeto_tem_motor_com_rele_sobrecarga(projeto) -> bool:
    """
    Verifica se o projeto exige geração de sugestões de relé de sobrecarga:
    motor com proteção RELE_SOBRECARGA.
    """
    existe = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_motor_com_rele_sobrecarga = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_carga_com_minidisjuntor(projeto) -> bool:
    """
    Projeto com motor ou resistência cuja proteção elétrica é minidisjuntor.
    """
    existe_motor = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
    ).exists()
    existe_resistencia = CargaResistencia.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.RESISTENCIA,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
    ).exists()
    existe = existe_motor or existe_resistencia

    print(
        "[ORQUESTRADOR] projeto_tem_carga_com_minidisjuntor = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def projeto_tem_motor_com_fusivel(projeto) -> bool:
    """
    Verifica se o projeto exige geração de sugestões de fusível:
    motor com proteção FUSIVEL.
    """
    existe = CargaMotor.objects.filter(
        carga__projeto=projeto,
        carga__ativo=True,
        carga__tipo=TipoCargaChoices.MOTOR,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    ).exists()

    print(
        "[ORQUESTRADOR] projeto_tem_motor_com_fusivel = "
        f"{existe} para projeto {projeto.id}"
    )
    return existe


def montar_etapas_geracao(projeto):
    """
    Monta dinamicamente a lista de etapas a executar para o projeto.
    """
    etapas = list(ETAPAS_GERACAO_BASE)

    if projeto_tem_resistencia_com_rele_estado_solido(projeto):
        etapas.append(
            ("RELES_ESTADO_SOLIDO", gerar_sugestoes_reles_estado_solido)
        )

    if projeto_tem_carga_com_rele_interface(projeto):
        etapas.append(("RELES_INTERFACE", gerar_sugestoes_reles_interface))

    if projeto_tem_valvula_com_sugestao_borne(projeto):
        etapas.append(("BORNES", gerar_sugestoes_bornes))

    if projeto_tem_motor_soft_starter_trifasico(projeto):
        etapas.append(
            ("SOFT_STARTER", gerar_sugestoes_soft_starters)
        )

    if projeto_tem_motor_inversor_frequencia(projeto):
        etapas.append(
            ("INVERSOR_FREQUENCIA", gerar_sugestoes_inversores_frequencia)
        )

    if projeto_tem_motor_com_disjuntor_motor(projeto):
        etapas.append(
            ("DISJUNTORES_MOTOR", gerar_sugestoes_disjuntores_motor)
        )

    if projeto_tem_carga_com_minidisjuntor(projeto):
        etapas.append(
            ("MINIDISJUNTOR", gerar_sugestoes_minidisjuntores)
        )

    if projeto_tem_motor_com_rele_sobrecarga(projeto):
        etapas.append(
            ("RELES_SOBRECARGA", gerar_sugestoes_reles_sobrecarga)
        )

    if projeto_tem_motor_com_fusivel(projeto):
        etapas.append(("FUSIVEIS", gerar_sugestoes_fusiveis))

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
            "indice_escopo",
        )
    )
    if not chaves_aprovadas:
        return 0

    sugestoes_ids = [
        sug_id
        for sug_id, parte, categoria, carga_id, indice_escopo in SugestaoItem.objects.filter(
            projeto=projeto
        ).values_list(
            "id", "parte_painel", "categoria_produto", "carga_id", "indice_escopo"
        )
        if (parte, categoria, carga_id, indice_escopo) in chaves_aprovadas
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
            # Savepoint: falha de BD na etapa não deixa a transação do orquestrador
            # em estado inválido (evita TransactionManagementError nas etapas finais).
            with transaction.atomic():
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
