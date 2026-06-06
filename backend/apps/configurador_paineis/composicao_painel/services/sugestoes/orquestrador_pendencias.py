"""Reavalia pendências abertas tentando regenerar sugestões por carga."""

from dataclasses import dataclass
from typing import Optional

from apps.configurador_paineis.dimensionamento.services import calcular_e_salvar_dimensionamento_basico

from apps.configurador_paineis.composicao_painel.models import PendenciaItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.contatoras import reprocessar_contatora_para_carga
from apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntores_motor import (
    reprocessar_disjuntor_motor_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.rele_sobrecarga import (
    reprocessar_rele_sobrecarga_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.fusivel import reprocessar_fusivel_para_carga
from apps.configurador_paineis.composicao_painel.services.sugestoes.minidisjuntores import (
    reprocessar_minidisjuntores_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.soft_starter import (
    reprocessar_soft_starter_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.inversores_frequencia import (
    reprocessar_inversores_frequencia_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.reles_estado_solido import (
    reprocessar_rele_estado_solido_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.reles_interface import (
    reprocessar_rele_interface_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.bornes import (
    reprocessar_bornes_para_carga,
)
from apps.configurador_paineis.composicao_painel.services.sugestoes.seccionadoras import (
    reprocessar_seccionamento_para_pendencia,
)

from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusPendenciaChoices,
)
from core.choices.cargas import TipoCargaChoices


@dataclass(frozen=True)
class _ConfigReprocessamento:
    reprocessar: str
    requer_carga: bool = True
    tipos_carga_permitidos: Optional[frozenset] = None
    mensagem_sem_carga: str = "Pendência sem carga vinculada."


def _reprocessar_com_carga(projeto, pendencia, resultado, config: _ConfigReprocessamento) -> bool:
    """Retorna True se reprocessou; False se registrou erro e deve continuar o loop."""
    if config.requer_carga and pendencia.carga_id is None:
        resultado["erros"].append(
            {
                "categoria_produto": pendencia.categoria_produto,
                "erro": config.mensagem_sem_carga,
            }
        )
        return False

    if config.tipos_carga_permitidos is not None:
        if pendencia.carga.tipo not in config.tipos_carga_permitidos:
            resultado["categorias_nao_mapeadas"].append(
                f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
            )
            return False

    globals()[config.reprocessar](projeto, pendencia.carga)
    return True


def _label_pendencia(pendencia) -> str:
    label = f"{pendencia.parte_painel}/{pendencia.categoria_produto}"
    if pendencia.carga_id:
        label += f"/carga={pendencia.carga_id}"
    return label


def _chave_pendencia(pendencia) -> tuple[str, str, str]:
    carga_id = str(pendencia.carga_id) if pendencia.carga_id else ""
    return pendencia.parte_painel, pendencia.categoria_produto, carga_id


def _reprocessar_pendencia(projeto, pendencia, resultado) -> bool:
    config = _REPROCESSADORES.get(
        (pendencia.parte_painel, pendencia.categoria_produto)
    )
    if config is not None:
        return _reprocessar_com_carga(projeto, pendencia, resultado, config)

    if pendencia.parte_painel == PartesPainelChoices.SECCIONAMENTO:
        reprocessar_seccionamento_para_pendencia(projeto, pendencia)
        return True

    resultado["categorias_nao_mapeadas"].append(
        f"{pendencia.parte_painel}:{pendencia.categoria_produto}"
    )
    return False


_REPROCESSADORES: dict[tuple[str, str], _ConfigReprocessamento] = {
    (
        PartesPainelChoices.ACIONAMENTO_CARGA,
        CategoriaProdutoNomeChoices.CONTATORA,
    ): _ConfigReprocessamento(
        "reprocessar_contatora_para_carga",
        mensagem_sem_carga="Pendência de contatora sem carga vinculada.",
    ),
    (
        PartesPainelChoices.ACIONAMENTO_CARGA,
        CategoriaProdutoNomeChoices.SOFT_STARTER,
    ): _ConfigReprocessamento(
        "reprocessar_soft_starter_para_carga",
        mensagem_sem_carga="Pendência de soft starter sem carga vinculada.",
    ),
    (
        PartesPainelChoices.ACIONAMENTO_CARGA,
        CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
    ): _ConfigReprocessamento(
        "reprocessar_inversores_frequencia_para_carga",
        mensagem_sem_carga="Pendência de inversor de frequência sem carga vinculada.",
    ),
    (
        PartesPainelChoices.ACIONAMENTO_CARGA,
        CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
    ): _ConfigReprocessamento(
        "reprocessar_rele_estado_solido_para_carga",
        tipos_carga_permitidos=frozenset({TipoCargaChoices.RESISTENCIA}),
        mensagem_sem_carga="Pendência de relé de estado sólido sem carga vinculada.",
    ),
    (
        PartesPainelChoices.ACIONAMENTO_CARGA,
        CategoriaProdutoNomeChoices.RELE_INTERFACE,
    ): _ConfigReprocessamento(
        "reprocessar_rele_interface_para_carga",
        tipos_carga_permitidos=frozenset({
            TipoCargaChoices.VALVULA,
            TipoCargaChoices.RESISTENCIA,
        }),
        mensagem_sem_carga="Pendência de relé de interface sem carga vinculada.",
    ),
    (
        PartesPainelChoices.BORNES,
        CategoriaProdutoNomeChoices.BORNE,
    ): _ConfigReprocessamento(
        "reprocessar_bornes_para_carga",
        tipos_carga_permitidos=frozenset({TipoCargaChoices.VALVULA}),
        mensagem_sem_carga="Pendência de borne sem carga vinculada.",
    ),
    (
        PartesPainelChoices.PROTECAO_CARGA,
        CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ): _ConfigReprocessamento(
        "reprocessar_disjuntor_motor_para_carga",
        mensagem_sem_carga="Pendência de disjuntor motor sem carga vinculada.",
    ),
    (
        PartesPainelChoices.PROTECAO_CARGA,
        CategoriaProdutoNomeChoices.MINIDISJUNTOR,
    ): _ConfigReprocessamento(
        "reprocessar_minidisjuntores_para_carga",
        tipos_carga_permitidos=frozenset({
            TipoCargaChoices.MOTOR,
            TipoCargaChoices.RESISTENCIA,
        }),
        mensagem_sem_carga="Pendência de minidisjuntor sem carga vinculada.",
    ),
    (
        PartesPainelChoices.PROTECAO_CARGA,
        CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ): _ConfigReprocessamento(
        "reprocessar_rele_sobrecarga_para_carga",
        mensagem_sem_carga="Pendência de relé de sobrecarga sem carga vinculada.",
    ),
    (
        PartesPainelChoices.PROTECAO_CARGA,
        CategoriaProdutoNomeChoices.FUSIVEL,
    ): _ConfigReprocessamento(
        "reprocessar_fusivel_para_carga",
        mensagem_sem_carga="Pendência de fusível sem carga vinculada.",
    ),
}


def reavaliar_pendencias_projeto(projeto):
    if projeto is None:
        raise ValueError("Projeto não informado.")

    calcular_e_salvar_dimensionamento_basico(projeto)

    pendencias_abertas = (
        PendenciaItem.objects.filter(
            projeto=projeto,
            status=StatusPendenciaChoices.ABERTA,
            categoria_produto__isnull=False,
        )
        .select_related("carga", "projeto")
        .order_by("ordem", "id")
    )

    pendencias_lista = list(pendencias_abertas)

    categorias_encontradas = sorted(
        {p.categoria_produto for p in pendencias_lista}
    )

    resultado = {
        "projeto_id": projeto.id,
        "pendencias_analisadas": len(pendencias_lista),
        "categorias_encontradas": categorias_encontradas,
        "categorias_reavaliadas": [],
        "escopos_reprocessados": [],
        "categorias_nao_mapeadas": [],
        "erros": [],
    }

    vistos = set()
    categorias_ok = set()

    for pendencia in pendencias_lista:
        chave = _chave_pendencia(pendencia)
        if chave in vistos:
            continue
        vistos.add(chave)

        try:
            if not _reprocessar_pendencia(projeto, pendencia, resultado):
                continue

            categorias_ok.add(pendencia.categoria_produto)
            resultado["escopos_reprocessados"].append(_label_pendencia(pendencia))

        except Exception as exc:
            resultado["erros"].append(
                {
                    "categoria_produto": pendencia.categoria_produto,
                    "erro": str(exc),
                }
            )

    resultado["categorias_reavaliadas"] = sorted(categorias_ok)

    return resultado
