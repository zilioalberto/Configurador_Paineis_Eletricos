from typing import Optional

<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
from apps.configurador_paineis.cargas.models import Carga, CargaMotor
from apps.catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)
========
from cargas.models import Carga, CargaMotor, CargaResistencia
from composicao_painel.models import SugestaoItem, PendenciaItem
=======
from cargas.models import Carga, CargaMotor
from catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
from composicao_painel.models import PendenciaItem, SugestaoItem
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
from composicao_painel.services.sugestoes.executar_por_carga import (
    executar_com_savepoint_por_carga,
)

<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
from catalogo.selectors.disjuntores_motor import selecionar_disjuntores_motor
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py

=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
    StatusSugestaoChoices,
)
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
from core.choices.cargas import (
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)
=======
from core.choices.cargas import TipoCargaChoices, TipoProtecaoMotorChoices
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py


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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
    Gera ou atualiza sugestão/pendência de relé de sobrecarga para uma carga MOTOR
    quando CargaMotor.tipo_protecao for RELE_SOBRECARGA.
========
    Gera ou atualiza sugestão/pendência de disjuntor motor para uma carga MOTOR
    (proteção DISJUNTOR_MOTOR) ou RESISTENCIA (tipo_protecao DISJUNTOR_MOTOR).
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
    Gera ou atualiza sugestão/pendência de relé de sobrecarga para uma carga MOTOR
    quando CargaMotor.tipo_protecao for RELE_SOBRECARGA.
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
    """
    print("-" * 100)
    print(f"[RELE SOBRECARGA] Processando carga: id={carga.id} | carga={carga}")

<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
========
    corrente_referencia = None
    tipo_protecao_label = None
    memoria_tipo_protecao = ""
    tipo_protecao_kw: str | None = None

    if carga.tipo == TipoCargaChoices.MOTOR:
        try:
            carga_motor = CargaMotor.objects.get(carga=carga)
            print(f"[DISJUNTORES MOTOR] CargaMotor encontrada: id={carga_motor.id}")
        except CargaMotor.DoesNotExist:
            descricao = "Carga do tipo MOTOR sem registro correspondente em CargaMotor."

            memoria_calculo = (
                f"[DISJUNTOR MOTOR]\n"
                f"Carga: {carga}\n"
                f"Tipo de carga: {carga.tipo}\n"
                f"Motivo: registro CargaMotor não encontrado."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )

            print("[DISJUNTORES MOTOR] Pendência criada: CargaMotor não encontrada.")
            return None

        print(f"[DISJUNTORES MOTOR] Tipo proteção: {carga_motor.tipo_protecao}")

        if carga_motor.tipo_protecao != TipoProtecaoMotorChoices.DISJUNTOR_MOTOR:
            _limpar_escopo_disjuntor_motor_carga(projeto, carga)
            print(
                "[DISJUNTORES MOTOR] Tipo de proteção diferente de DISJUNTOR_MOTOR. Pulando carga."
            )
            return None

        corrente_referencia = carga_motor.corrente_calculada_a
        tipo_protecao_label = carga_motor.tipo_protecao
        memoria_tipo_protecao = f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"

    elif carga.tipo == TipoCargaChoices.RESISTENCIA:
        try:
            carga_resistencia = CargaResistencia.objects.get(carga=carga)
            print(
                f"[DISJUNTORES MOTOR] CargaResistencia encontrada: id={carga_resistencia.id}"
            )
        except CargaResistencia.DoesNotExist:
            descricao = (
                "Carga do tipo RESISTENCIA sem registro correspondente em CargaResistencia."
            )

            memoria_calculo = (
                f"[DISJUNTOR MOTOR]\n"
                f"Carga: {carga}\n"
                f"Tipo de carga: {carga.tipo}\n"
                f"Motivo: registro CargaResistencia não encontrado."
            )

            PendenciaItem.objects.update_or_create(
                projeto=projeto,
                parte_painel=PartesPainelChoices.PROTECAO_CARGA,
                categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
                carga=carga,
                defaults={
                    "descricao": descricao,
                    "corrente_referencia_a": None,
                    "memoria_calculo": memoria_calculo,
                    "status": StatusPendenciaChoices.ABERTA,
                    "ordem": 30,
                },
            )

            print("[DISJUNTORES MOTOR] Pendência criada: CargaResistencia não encontrada.")
            return None

        print(f"[DISJUNTORES MOTOR] Tipo proteção (resistência): {carga_resistencia.tipo_protecao}")

        if carga_resistencia.tipo_protecao != TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR:
            _limpar_escopo_disjuntor_motor_carga(projeto, carga)
            print(
                "[DISJUNTORES MOTOR] Proteção da resistência diferente de DISJUNTOR_MOTOR. "
                "Pulando carga."
            )
            return None

        corrente_referencia = carga_resistencia.corrente_calculada_a
        tipo_protecao_label = carga_resistencia.tipo_protecao
        tipo_protecao_kw = carga_resistencia.tipo_protecao
        memoria_tipo_protecao = (
            f"Tipo de proteção da resistência: {carga_resistencia.tipo_protecao}\n"
        )

    else:
        print("[DISJUNTORES MOTOR] Tipo de carga não tratado para disjuntor motor. Pulando.")
        return None

    print(f"[DISJUNTORES MOTOR] Corrente de referência: {corrente_referencia}")
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py

    if corrente_referencia is None:
        descricao = "Corrente calculada não encontrada para seleção do relé de sobrecarga."

        memoria_calculo = (
            f"[RELE SOBRECARGA]\n"
            f"Carga: {carga}\n"
            f"Tipo de carga: {carga.tipo}\n"
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
            f"{memoria_tipo_protecao}"
=======
            f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        tipo_carga=carga.tipo,
        tipo_protecao=tipo_protecao_kw,
=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        f"{memoria_tipo_protecao}"
=======
        f"Tipo de proteção do motor: {carga_motor.tipo_protecao}\n"
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
            f"Tipo de proteção: {tipo_protecao_label}"
=======
            f"Tipo de proteção: {carga_motor.tipo_protecao}"
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
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
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
    Gera sugestões de relés de sobrecarga para cargas MOTOR.

    Só gera sugestão quando CargaMotor.tipo_protecao for RELE_SOBRECARGA.
    Percorre todas as cargas MOTOR ativas para aplicar limpeza quando a proteção
    deixa de ser relé de sobrecarga.
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
========
    Gera sugestões de disjuntores motor para cargas MOTOR e RESISTENCIA.

    MOTOR: só se CargaMotor.tipo_protecao for DISJUNTOR_MOTOR.
    RESISTENCIA: só se CargaResistencia.tipo_protecao for DISJUNTOR_MOTOR
    (alinhado a catalogo.selectors.selecionar_disjuntores_motor).

    Percorre todas as cargas MOTOR/RESISTENCIA ativas para aplicar limpeza quando
    a proteção deixa de ser disjuntor motor.

    Remove antes sugestões/pendências de disjuntor motor dessas cargas no projeto.
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
    """
    print("\n" + "=" * 100)
    print("[RELE SOBRECARGA] Iniciando gerar_sugestoes_reles_sobrecarga")
    print(f"[RELE SOBRECARGA] Projeto: id={projeto.id} | projeto={projeto}")

<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
    tipos_disjuntor = [TipoCargaChoices.MOTOR, TipoCargaChoices.RESISTENCIA]

    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Sugestões antigas removidas: {deletados_sugestoes}")
========
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ).filter(carga__tipo__in=tipos_disjuntor).delete()
    print(f"[DISJUNTORES MOTOR] Sugestões antigas removidas: {deletados_sugestoes}")
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
    deletados_sugestoes, _ = SugestaoItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Sugestões antigas removidas: {deletados_sugestoes}")
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py

    deletados_pendencias, _ = PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Pendências antigas removidas: {deletados_pendencias}")
========
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ).filter(carga__tipo__in=tipos_disjuntor).delete()
    print(f"[DISJUNTORES MOTOR] Pendências antigas removidas: {deletados_pendencias}")
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).filter(carga__tipo=TipoCargaChoices.MOTOR).delete()
    print(f"[RELE SOBRECARGA] Pendências antigas removidas: {deletados_pendencias}")
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py

    cargas = Carga.objects.filter(
        projeto=projeto,
        ativo=True,
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        tipo__in=tipos_disjuntor,
    )

<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
    print(f"[RELE SOBRECARGA] Total de cargas elegíveis: {cargas.count()}")
========
    print(f"[DISJUNTORES MOTOR] Total de cargas elegíveis: {cargas.count()}")
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
        tipo=TipoCargaChoices.MOTOR,
    )

    print(f"[RELE SOBRECARGA] Total de cargas elegíveis: {cargas.count()}")
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py

    sugestoes_criadas = executar_com_savepoint_por_carga(
        projeto,
        cargas,
<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
<<<<<<<< HEAD:backend/apps/configurador_paineis/composicao_painel/services/sugestoes/rele_sobrecarga.py
        "[RELE SOBRECARGA]",
        processar_sugestao_rele_sobrecarga_para_carga,
========
        "[DISJUNTORES MOTOR]",
        processar_sugestao_disjuntor_motor_para_carga,
>>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/disjuntores_motor.py
=======
        "[RELE SOBRECARGA]",
        processar_sugestao_rele_sobrecarga_para_carga,
>>>>>>> origin/main:backend/composicao_painel/services/sugestoes/rele_sobrecarga.py
    )

    print("-" * 100)
    print(f"[RELE SOBRECARGA] Total de sugestões criadas: {len(sugestoes_criadas)}")
    print("[RELE SOBRECARGA] Finalizando gerar_sugestoes_reles_sobrecarga")
    print("=" * 100 + "\n")

    return sugestoes_criadas
