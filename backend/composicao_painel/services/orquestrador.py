from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from composicao_painel.models import SugestaoItem
from composicao_painel.services.conjuntos import garantir_conjuntos_padrao
from composicao_painel.services.sugestoes.base import limpar_sugestoes_pendentes
from composicao_painel.services.sugestoes.protecao_motor import (
    gerar_sugestoes_protecao_motor,
)

from core.choices.cargas import TipoCargaChoices


@dataclass
class ResultadoOrquestracaoSugestoes:
    """
    Estrutura de retorno da orquestração.
    """
    projeto_id: int | None = None
    conjuntos_garantidos: bool = False
    cargas_processadas: int = 0
    sugestoes_criadas: int = 0
    erros: list[dict[str, Any]] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)

    def adicionar_erro(self, carga_id: int | None, mensagem: str) -> None:
        self.erros.append(
            {
                "carga_id": carga_id,
                "mensagem": mensagem,
            }
        )

    @property
    def possui_erros(self) -> bool:
        return len(self.erros) > 0


def _obter_queryset_cargas_projeto(projeto):
    """
    Retorna queryset base das cargas do projeto.

    Ajuste o filtro de 'ativo' conforme o seu model real.
    """
    queryset = projeto.cargas.all()

    # Se a carga possuir campo 'ativo', filtra apenas as ativas.
    if hasattr(queryset.model, "ativo"):
        queryset = queryset.filter(ativo=True)

    return queryset.order_by("id")


def _gerar_sugestoes_para_carga(projeto, carga) -> list[SugestaoItem]:
    """
    Direciona a carga para o gerador adequado.
    """
    tipo_carga = getattr(carga, "tipo_carga", None)

    if tipo_carga == TipoCargaChoices.MOTOR:
        return gerar_sugestoes_protecao_motor(projeto, carga)

    # Demais tipos serão implementados depois.
    return []


def gerar_sugestoes_projeto(
    projeto,
    *,
    limpar_pendentes_antes: bool = False,
) -> ResultadoOrquestracaoSugestoes:
    """
    Gera sugestões para todas as cargas do projeto.

    Fluxo:
    1. garante conjuntos padrão
    2. opcionalmente limpa sugestões pendentes do projeto
    3. percorre cargas
    4. chama geradores por tipo
    5. retorna resumo
    """
    resultado = ResultadoOrquestracaoSugestoes(
        projeto_id=getattr(projeto, "id", None),
    )

    garantir_conjuntos_padrao(projeto)
    resultado.conjuntos_garantidos = True

    if limpar_pendentes_antes:
        limpar_sugestoes_pendentes(projeto)

    cargas = _obter_queryset_cargas_projeto(projeto)

    for carga in cargas:
        resultado.cargas_processadas += 1

        try:
            sugestoes = _gerar_sugestoes_para_carga(projeto, carga)
            resultado.sugestoes_criadas += len(sugestoes)
        except Exception as exc:
            resultado.adicionar_erro(
                carga_id=getattr(carga, "id", None),
                mensagem=str(exc),
            )

    return resultado


def regerar_sugestoes_projeto(projeto) -> ResultadoOrquestracaoSugestoes:
    """
    Regera as sugestões pendentes do projeto inteiro.

    Remove apenas sugestões pendentes e gera novamente.
    """
    return gerar_sugestoes_projeto(
        projeto,
        limpar_pendentes_antes=True,
    )


def gerar_sugestoes_carga(projeto, carga) -> list[SugestaoItem]:
    """
    Gera sugestões somente para uma carga específica.
    """
    garantir_conjuntos_padrao(projeto)
    return _gerar_sugestoes_para_carga(projeto, carga)