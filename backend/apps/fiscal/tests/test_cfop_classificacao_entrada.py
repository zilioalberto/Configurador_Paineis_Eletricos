"""Testes do classificador de CFOP de entrada."""
from decimal import Decimal

from apps.fiscal.choices import ObjetivoEntradaFiscalChoices
from apps.fiscal.services.cfop_classificacao_entrada import (
    classificar_cfop_entrada,
    objetivo_entrada_predominante,
)


class TestClassificarCfopEntrada:
    def test_compra_industrializacao(self):
        assert (
            classificar_cfop_entrada("1101").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.INDUSTRIALIZACAO
        )

    def test_compra_revenda(self):
        assert (
            classificar_cfop_entrada("1102").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.REVENDA
        )

    def test_interestadual_revenda(self):
        assert (
            classificar_cfop_entrada("2102").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.REVENDA
        )

    def test_uso_consumo(self):
        assert (
            classificar_cfop_entrada("1556").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.USO_CONSUMO
        )

    def test_ativo_imobilizado(self):
        assert (
            classificar_cfop_entrada("1551").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.ATIVO_IMOBILIZADO
        )

    def test_importacao_3xxx(self):
        assert (
            classificar_cfop_entrada("3102").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.IMPORTACAO
        )

    def test_devolucao_venda(self):
        assert (
            classificar_cfop_entrada("1202").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.DEVOLUCAO_VENDA
        )

    def test_transferencia(self):
        assert (
            classificar_cfop_entrada("1152").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.TRANSFERENCIA
        )

    def test_cfop_saida_nao_classifica_como_entrada(self):
        assert (
            classificar_cfop_entrada("5102").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
        )

    def test_cfop_vazio(self):
        assert (
            classificar_cfop_entrada("").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
        )

    def test_cfop_formatado_com_ponto(self):
        assert (
            classificar_cfop_entrada("1.102").objetivo_entrada
            == ObjetivoEntradaFiscalChoices.REVENDA
        )


class TestObjetivoPredominante:
    def test_predominante_por_maior_valor(self):
        itens = [
            {"cfop": "1102", "valor_total": Decimal("100")},
            {"cfop": "1556", "valor_total": Decimal("900")},
        ]
        assert objetivo_entrada_predominante(itens) == ObjetivoEntradaFiscalChoices.USO_CONSUMO

    def test_sem_itens(self):
        assert objetivo_entrada_predominante([]) == ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
