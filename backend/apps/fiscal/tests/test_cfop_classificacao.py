from django.test import TestCase

from apps.fiscal.choices import (
    AnexoSimplesNacionalChoices,
    ObjetivoSaidaFiscalChoices,
)
from apps.fiscal.services.cfop_classificacao import classificar_cfop


class CfopClassificacaoTests(TestCase):
    def test_venda_revenda_anexo_i(self):
        r = classificar_cfop("5102")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.VENDA_PRODUTO)
        self.assertEqual(r.anexo_simples, AnexoSimplesNacionalChoices.I)
        self.assertTrue(r.incluir_faturamento)

    def test_industrializacao_anexo_ii(self):
        r = classificar_cfop("5124")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.INDUSTRIALIZACAO)
        self.assertEqual(r.anexo_simples, AnexoSimplesNacionalChoices.II)

    def test_devolucao_exclui_faturamento(self):
        r = classificar_cfop("5201")
        self.assertFalse(r.incluir_faturamento)
        self.assertEqual(r.anexo_simples, AnexoSimplesNacionalChoices.NENHUM)

    def test_servico_sem_anexo_fixo(self):
        r = classificar_cfop("5933")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.PRESTACAO_SERVICO)
        self.assertEqual(r.anexo_simples, "")
