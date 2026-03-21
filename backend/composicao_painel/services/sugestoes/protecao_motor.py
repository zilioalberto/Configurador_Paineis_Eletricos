from __future__ import annotations

from composicao_painel.models import SugestaoItem, ConjuntoPainel
from composicao_painel.services.sugestoes.base import BaseGeradorSugestao,limpar_sugestoes_pendentes

from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices
from core.choices.produtos import CategoriaProdutoNomeChoices
from core.choices.paineis import PartesPainelChoices



try:
    from catalogo.selectors import (
        selecionar_contatoras,
        selecionar_disjuntores_motor,
        selecionar_reles_sobrecarga,
    )
except Exception:
    selecionar_contatoras = None
    selecionar_disjuntores_motor = None
    selecionar_reles_sobrecarga = None


class GeradorProtecaoMotor(BaseGeradorSugestao):
    """
    Gera sugestões de componentes para cargas do tipo motor.
    """

    tipo_sugestao = CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR
    nome_conjunto = PartesPainelChoices.POTENCIA
    ordem_conjunto = 20

    def __init__(self, projeto, carga):
        super().__init__(projeto)
        self.carga = carga

    def validar(self) -> None:
        super().validar()

        if not self.carga:
            raise ValueError("Carga não informada.")

        if self.carga.tipo_carga != TipoCargaChoices.MOTOR:
            raise ValueError("GeradorProtecaoMotor só pode ser usado para cargas do tipo MOTOR.")

    def gerar(self) -> list[SugestaoItem]:
        self.validar()

        for tipo in [
        CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        CategoriaProdutoNomeChoices.CONTATORA,
        CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ]:
            
        limpar_sugestoes_pendentes(
            self.projeto,
            tipo_sugestao=tipo,
            carga=self.carga,
    )
        sugestoes = []
        sugestoes.extend(self._gerar_disjuntor_motor())
        sugestoes.extend(self._gerar_contatora())
        sugestoes.extend(self._gerar_rele_sobrecarga())

        return sugestoes

    def _descricao_base_carga(self) -> str:
        nome = getattr(self.carga, "nome", None) or f"Carga {self.carga.pk}"
        return str(nome)

    def _corrente_referencia(self):
        if hasattr(self.carga, "corrente_nominal_a") and self.carga.corrente_nominal_a:
            return self.carga.corrente_nominal_a

        if hasattr(self.carga, "corrente_calculada_a") and self.carga.corrente_calculada_a:
            return self.carga.corrente_calculada_a

        return None

    def _gerar_disjuntor_motor(self) -> list[SugestaoItem]:
        descricao_carga = self._descricao_base_carga()
        corrente = self._corrente_referencia()

        produto = None

        if selecionar_disjuntores_motor and corrente:
            try:
                candidatos = selecionar_disjuntores_motor(
                    corrente_nominal=corrente,
                )
                if candidatos:
                    produto = candidatos[0]
            except Exception:
                produto = None

        justificativa = f"Proteção de curto-circuito/manobra para motor da carga {descricao_carga}."

        sugestao = self.criar_sugestao(
            descricao=f"Disjuntor motor para {descricao_carga}",
            produto=produto,
            carga=self.carga,
            justificativa=justificativa,
            quantidade=1,
            unidade="UN",
        )
        sugestao.tipo_sugestao = CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR
        sugestao.save(update_fields=["tipo_sugestao", "atualizado_em"])

        return [sugestao]

    def _gerar_contatora(self) -> list[SugestaoItem]:
        descricao_carga = self._descricao_base_carga()
        corrente = self._corrente_referencia()

        tipo_partida = getattr(self.carga, "tipo_partida", None)

        if tipo_partida not in [
            TipoPartidaMotorChoices.DIRETA,
            TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
            TipoPartidaMotorChoices.SOFT_STARTER,
            TipoPartidaMotorChoices.INVERSOR_FREQUENCIA,
        ]:
            return []

        produto = None

        if selecionar_contatoras and corrente:
            try:
                candidatos = selecionar_contatoras(
                    corrente_nominal=corrente,
                )
                if candidatos:
                    produto = candidatos[0]
            except Exception:
                produto = None

        justificativa = f"Contatora para acionamento da carga {descricao_carga}."

        sugestao = self.criar_sugestao(
            descricao=f"Contatora para {descricao_carga}",
            produto=produto,
            carga=self.carga,
            justificativa=justificativa,
            quantidade=1,
            unidade="UN",
        )
        sugestao.tipo_sugestao = CategoriaProdutoNomeChoices.CONTATORA
        sugestao.save(update_fields=["tipo_sugestao", "atualizado_em"])

        return [sugestao]

    def _gerar_rele_sobrecarga(self) -> list[SugestaoItem]:
        descricao_carga = self._descricao_base_carga()
        corrente = self._corrente_referencia()

        tipo_partida = getattr(self.carga, "tipo_partida", None)

        if tipo_partida == TipoPartidaMotorChoices.INVERSOR_FREQUENCIA:
            return []

        produto = None

        if selecionar_reles_sobrecarga and corrente:
            try:
                candidatos = selecionar_reles_sobrecarga(
                    corrente_nominal=corrente,
                )
                if candidatos:
                    produto = candidatos[0]
            except Exception:
                produto = None

        justificativa = f"Proteção de sobrecarga para motor da carga {descricao_carga}."

        sugestao = self.criar_sugestao(
            descricao=f"Relé de sobrecarga para {descricao_carga}",
            produto=produto,
            carga=self.carga,
            justificativa=justificativa,
            quantidade=1,
            unidade="UN",
        )
        sugestao.tipo_sugestao = CategoriaProdutoNomeChoices.RELE_SOBRECARGA
        sugestao.save(update_fields=["tipo_sugestao", "atualizado_em"])

        return [sugestao]


def gerar_sugestoes_protecao_motor(projeto, carga) -> list[SugestaoItem]:
    return GeradorProtecaoMotor(projeto=projeto, carga=carga).gerar()