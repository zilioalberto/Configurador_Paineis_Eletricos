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

    def test_industrializacao_faturada_compoe(self):
        r = classificar_cfop("5124")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.INDUSTRIALIZACAO)
        self.assertEqual(r.anexo_simples, AnexoSimplesNacionalChoices.II)
        self.assertTrue(r.incluir_faturamento)

    def test_devolucao_exclui_faturamento(self):
        r = classificar_cfop("5201")
        self.assertFalse(r.incluir_faturamento)
        self.assertEqual(r.anexo_simples, AnexoSimplesNacionalChoices.NENHUM)

    def test_servico_compoe_faturamento(self):
        r = classificar_cfop("5933")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.PRESTACAO_SERVICO)
        self.assertEqual(r.anexo_simples, "")
        self.assertTrue(r.incluir_faturamento)

    def test_cfop_vazio_nao_compoe(self):
        r = classificar_cfop("")
        self.assertFalse(r.incluir_faturamento)

    def test_remessa_industrializacao_nao_compoe(self):
        r = classificar_cfop("5901")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.REMESSA)
        self.assertFalse(r.incluir_faturamento)

    def test_retorno_industrializacao_nao_compoe(self):
        r = classificar_cfop("6902")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.REMESSA)
        self.assertFalse(r.incluir_faturamento)

    def test_transferencia_nao_compoe(self):
        r = classificar_cfop("5152")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.TRANSFERENCIA)
        self.assertFalse(r.incluir_faturamento)

    def test_cfop_desconhecido_nao_compoe(self):
        r = classificar_cfop("5999")
        self.assertEqual(r.objetivo_saida, ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS)
        self.assertFalse(r.incluir_faturamento)

    def test_simples_faturamento_nao_compoe(self):
        r = classificar_cfop("5922")
        self.assertFalse(r.incluir_faturamento)
