"""Testes de parsers de PDF fiscal."""
from decimal import Decimal

from apps.fiscal.services.obrigacoes.parsers.darf import parse_darf
from apps.fiscal.services.obrigacoes.parsers.fgts import parse_fgts
from apps.fiscal.services.obrigacoes.parsers.holerite import parse_holerites
from apps.fiscal.services.obrigacoes.parsers.iss import parse_iss

DARF_TEXTO = """
Documento de Arrecadação de Receitas Federais
Período de Apuração Março/2026
Pagar este documento até 20/04/2026
Número do Documento 07.16.26099.2164387-2
Valor Total do Documento 1.118,26
1082 CONTR PREV DESCONTA SEGURADO-EMPREGADO/AVULSO 279,95 279,95
1099 CP DESCONTADA SEGURADO - CONTRIB INDIVIDUAL 838,31 838,31
PA:03/2026 Vencimento:20/04/2026
Totais 1.118,26 1.118,26
"""

FGTS_TEXTO = """
GFD - Guia do FGTS Digital
Tag FGTS 03/2026
Pagar este documento até 20/04/2026
Valor a recolher 291,75
Total da Guia: 291,75
03/2026 2 Trabalhadores
Identificador 0126040931557112-4
"""

ISS_TEXTO = """
ISS Variavel (23)
Competência 03/2026.
NFS-e Nº: 1088, Série: A1 Tomador: 84.693.183/0001-68
Imposto Sobre Serviços: R$ 23,27
VENCIMENTO 15/04/2026
NOSSO NÚMERO 926260000031635
(=) VALOR COBRADO 23,27
"""


def test_parse_darf():
    r = parse_darf(DARF_TEXTO)
    assert r["competencia"] == "2026-03"
    assert Decimal(r["valor"]) == Decimal("1118.26")
    assert len(r["linhas_composicao"]) >= 2


def test_parse_fgts():
    r = parse_fgts(FGTS_TEXTO)
    assert r["competencia"] == "2026-03"
    assert Decimal(r["valor"]) == Decimal("291.75")


def test_parse_iss_competencia_prioriza_campo_competencia():
    texto = ISS_TEXTO.replace("Competência 03/2026", "Competência 03/2026") + "\nVENCIMENTO 15/04/2026"
    r = parse_iss(texto)
    assert r["competencia"] == "2026-03"


def test_parse_iss():
    r = parse_iss(ISS_TEXTO)
    assert r["competencia"] == "2026-03"
    assert Decimal(r["valor"]) == Decimal("23.27")
    assert r["dados_extra"]["numero_nfse"] == "1088"


def test_parse_holerites():
    texto = """
    Demonstrativo de Pagamento 03/2026
    CPF: 117.886.399-95 Nome do Funcionário ALICE ZILIO CBO
    950 INSS 7,50 % 119,77
    Total 1.596,94 119,77
    Bas Cálc FGTS 1.596,94 FGTS Mês 127,75
    """
    r = parse_holerites(texto)
    assert r["competencia"] == "2026-03"
    assert len(r["holerites"]) >= 1
    assert r["holerites"][0]["nome"] == "ALICE ZILIO"


HOLERITE_TEXTO_ZFW = """
Demonstrativo de Pagamento 03/2026
CPF: 076.595.139-82
Cadastro Nome do Funcionário CBO Empresa Local Departamento FL
6 RAF AEL  CAS AGRANDE 123105 524 1 43 01
Total 3.500,00 385,00
Bas Cálc FGTS 3.500,00 FGTS Mês 0,00
"""


def test_parse_holerite_nome_quebrado_pdf():
    r = parse_holerites(HOLERITE_TEXTO_ZFW)
    assert r["holerites"][0]["nome"] == "RAF AEL CAS AGRANDE"


SIMPLES_TEXTO = """
Documento de Arrecadação do Simples Nacional
07.284.171/0001-39 ZFW ENGENHARIA EM CONTROLE E SISTEMAS LTDA
Período de Apuração Data de Vencimento Número do Documento
07.20.26036.2701844-0
Pagar este documento até
20/02/2026
Valor Total do Documento
26.610,30
Janeiro/2026 20/02/2026
Composição do Documento de Arrecadação
1001 IRPJ - SIMPLES NACIONAL 5.832,48 5.832,48
01/2026
1002 CSLL - SIMPLES NACIONAL 3.057,32 3.057,32
1004 COFINS - SIMPLES NACIONAL 5.300,64 5.300,64
1005 PIS - SIMPLES NACIONAL 1.148,18 1.148,18
1006 INSS - SIMPLES NACIONAL 8.008,93 8.008,93
1008 IPI - SIMPLES NACIONAL 3.262,75 3.262,75
Totais 26.610,30 26.610,30
Valor: 26.610,30
"""


def test_parse_simples_janeiro_2026():
    from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples
    from apps.fiscal.services.obrigacoes.pdf_util import detectar_tipo_anexo

    assert detectar_tipo_anexo("arrecadacao.pdf", SIMPLES_TEXTO) == "SIMPLES"
    r = parse_simples(SIMPLES_TEXTO)
    assert r["competencia"] == "2026-01"
    assert Decimal(r["valor"]) == Decimal("26610.30")
    assert r["data_vencimento"] == "2026-02-20"
    assert len(r["linhas_composicao"]) == 6
    assert r["linhas_composicao"][0]["codigo"] == "1001"
    assert r["sucesso"] is True


def test_parse_pdf_escaneado_detecta_simples_pelo_nome():
    from apps.fiscal.services.obrigacoes.parse_pdf import parse_pdf_obrigacao

    r = parse_pdf_obrigacao(
        arquivo_bytes=b"%PDF escaneado vazio",
        nome_arquivo="ZFW - SIMPLES NACIONAL 03-2026.pdf",
    )
    assert r["tipo_anexo"] == "SIMPLES"
    assert r["sucesso"] is False
    assert "escaneado" in (r.get("erros") or [""])[0].lower()


def test_detectar_darf_nao_e_simples():
    from apps.fiscal.services.obrigacoes.pdf_util import detectar_tipo_anexo

    assert detectar_tipo_anexo("DARF 01.2026.pdf", DARF_TEXTO) == "DARF"
    assert detectar_tipo_anexo("documento.pdf", DARF_TEXTO) == "DARF"


def test_parse_dime_valores_contabeis_quadro03():
    from apps.fiscal.services.obrigacoes.parsers.dime_icms import parse_dime_icms

    texto = """
    Quadro 03 Resumo dos V alor es F iscais
    Entradas
    010 V alor Contábil  68.928,68
    Saídas
    060 V alor Contábil  118.702,99
    Período de referência da declaração 01/2026
    """
    r = parse_dime_icms(texto)
    snap = r["snapshot_icms"]
    assert Decimal(snap["valor_contabil_entradas"]) == Decimal("68928.68")
    assert Decimal(snap["valor_contabil_saidas"]) == Decimal("118702.99")


def test_detectar_simples_antes_de_darf():
    from apps.fiscal.choices import TipoObrigacaoFiscalChoices
    from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples
    from apps.fiscal.services.obrigacoes.pdf_util import detectar_tipo_anexo

    assert detectar_tipo_anexo("documento.pdf", SIMPLES_TEXTO) == "SIMPLES"
    resultado = parse_simples(SIMPLES_TEXTO)
    assert resultado["tipo_obrigacao"] == TipoObrigacaoFiscalChoices.DAS
    assert Decimal(resultado["valor"]) == Decimal("26610.30")
