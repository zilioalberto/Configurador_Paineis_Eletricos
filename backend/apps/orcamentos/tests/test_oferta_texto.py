import pytest

from apps.orcamentos.services.oferta_texto import (
    paragrafos_planos,
    segmentar_conteudo_oferta,
    texto_para_listing_docxtpl,
)


class TestOfertaTexto:
    def test_linha_em_branco_separa_paragrafos(self):
        blocos = segmentar_conteudo_oferta("Primeiro parágrafo.\n\nSegundo parágrafo.")
        assert len(blocos) == 2
        assert blocos[0].kind == "paragraph"
        assert blocos[1].texto_paragrafo == "Segundo parágrafo."

    def test_lista_com_marcador(self):
        blocos = segmentar_conteudo_oferta("- Item A\n- Item B")
        assert len(blocos) == 1
        assert blocos[0].kind == "list"
        assert blocos[0].lines == ("Item A", "Item B")

    def test_nao_junta_linhas_sem_linha_em_branco(self):
        planos = paragrafos_planos("Linha um\nLinha dois")
        assert planos == ["Linha um\nLinha dois"]

    def test_listing_sem_ponto_e_virgula_forcado(self):
        texto = texto_para_listing_docxtpl("- Alpha\n- Beta")
        assert ";" not in texto
        assert "Alpha" in texto
        assert "Beta" in texto
