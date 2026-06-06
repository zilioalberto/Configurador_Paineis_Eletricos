from pathlib import Path

from fiscal_ponte.sefaz.acbr_response import parse_acbr_distribuicao_resposta


def test_parse_resposta_com_arquivo(tmp_path: Path):
    xml_path = tmp_path / "doc-resNFe.xml"
    xml_path.write_text("<nfeProc>ok</nfeProc>", encoding="utf-8")
    texto = """
OK:
[DistribuicaoDFe]
CStat=138
ultNSU=000000000000100
maxNSU=000000000000100
XMotivo=Documento localizado
arquivo=doc-resNFe.xml
"""
    result = parse_acbr_distribuicao_resposta(
        texto,
        output_dir=tmp_path,
        ultimo_nsu_consulta="000000000000099",
    )
    assert result.cstat == "138"
    assert len(result.documentos) == 1
    assert "nfeProc" in result.documentos[0].xml
