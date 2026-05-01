from catalogo.utils.plc_familia import normalizar_chave_familia_plc


def test_normalizar_chave_familia_plc_vazio():
    assert normalizar_chave_familia_plc(None) == ""
    assert normalizar_chave_familia_plc("") == ""
    assert normalizar_chave_familia_plc("   ") == ""


def test_normalizar_chave_familia_plc_acentos_e_pontuacao():
    assert normalizar_chave_familia_plc("  S7-1200  ") == "s71200"
    assert normalizar_chave_familia_plc("Módulo_CP_1") == "modulocp1"
