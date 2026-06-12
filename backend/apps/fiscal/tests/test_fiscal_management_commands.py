import io
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.fiscal.models import DocumentoFiscalEmitido, DocumentoFiscalRecebido

CNPJ_ZFW = "07284171000139"

SEFAZ_STUB_SETTINGS = {
    "FISCAL_EMPRESA_CNPJ": CNPJ_ZFW,
    "FISCAL_SEFAZ_UF": "35",
    "FISCAL_SEFAZ_AMBIENTE": "2",
    "FISCAL_SEFAZ_PROVIDER": "stub",
    "FISCAL_CERT_PATH": "",
    "FISCAL_CERT_PASSWORD": "",
}


@pytest.mark.django_db
class TestFiscalListarDocumentosCnpjDivergenteCommand:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_lista_emitidas_divergentes_em_texto(self):
        DocumentoFiscalEmitido.objects.create(
            identificador="CMD:EMIT-DIV",
            tipo_documento="NFE_PRODUTO",
            cnpj_emitente="12345678000199",
            nome_emitente="Outro emitente",
            cnpj_destinatario=CNPJ_ZFW,
            nome_destinatario="ZFW",
            numero="100",
            serie="1",
            valor_total="500.00",
        )

        out = io.StringIO()
        call_command("fiscal_listar_documentos_cnpj_divergente", "--tipo=emitidas", stdout=out)

        texto = out.getvalue()
        assert CNPJ_ZFW in texto
        assert "Emitidas com emitente divergente: 1" in texto
        assert "nº 100/1" in texto

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_sem_divergentes_mensagem_sucesso(self):
        out = io.StringIO()
        call_command("fiscal_listar_documentos_cnpj_divergente", stdout=out)
        assert "Nenhum documento divergente encontrado." in out.getvalue()

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_csv_exporta_linhas(self, capsys):
        DocumentoFiscalRecebido.objects.create(
            chave_acesso="35260111222333000199550010000009991234567899",
            cnpj_emitente="12345678000199",
            nome_emitente="Fornecedor",
            cnpj_destinatario="98765432000188",
            nome_destinatario="Outro destinatário",
            numero="200",
            serie="2",
            valor_total="80.00",
            xml_original="<nfeProc />",
        )

        call_command(
            "fiscal_listar_documentos_cnpj_divergente",
            "--tipo=recebidas",
            "--csv",
        )

        saida = capsys.readouterr().out
        linhas = [ln for ln in saida.strip().splitlines() if ln.strip()]
        assert linhas[0].startswith("tipo,public_id,id")
        assert "RECEBIDA" in linhas[1]
        assert "200" in linhas[1]

    @override_settings(FISCAL_EMPRESA_CNPJ="")
    def test_cnpj_invalido_encerra_com_erro(self):
        err = io.StringIO()
        with pytest.raises(SystemExit) as exc:
            call_command(
                "fiscal_listar_documentos_cnpj_divergente",
                stderr=err,
            )
        assert exc.value.code == 1
        assert "FISCAL_EMPRESA_CNPJ" in err.getvalue()


class TestFiscalSyncNsuCommand:
    @override_settings(**SEFAZ_STUB_SETTINGS)
    def test_dry_run_sucesso(self):
        out = io.StringIO()
        call_command("fiscal_sync_nsu", "--dry-run", stdout=out)
        assert "ciclos=" in out.getvalue()

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_falha_configuracao_encerra(self):
        err = io.StringIO()
        with patch(
            "apps.fiscal.management.commands.fiscal_sync_nsu.get_sefaz_config",
            return_value=MagicMock(validate=MagicMock(side_effect=ValueError("cert inválido"))),
        ):
            with pytest.raises(SystemExit) as exc:
                call_command("fiscal_sync_nsu", stderr=err)
        assert exc.value.code == 1
        assert "cert inválido" in err.getvalue()

    @override_settings(**SEFAZ_STUB_SETTINGS)
    def test_sincronizacao_com_erro_importacao_imprime_warning(self):
        resultado = MagicMock(
            mensagem="ok",
            ciclos_executados=1,
            documentos_novos=0,
            documentos_duplicados=0,
            ultimo_cstat="137",
            ultimo_nsu="1",
            max_nsu="1",
            erros_importacao=["falha xml"],
            sucesso=True,
        )
        out = io.StringIO()
        err = io.StringIO()
        with patch(
            "apps.fiscal.management.commands.fiscal_sync_nsu.executar_sincronizacao_nsu",
            return_value=resultado,
        ):
            call_command("fiscal_sync_nsu", "--sem-manifestacao", stdout=out, stderr=err)
        assert "ciclos=1" in out.getvalue()
        assert "falha xml" in err.getvalue()

    @override_settings(**SEFAZ_STUB_SETTINGS)
    def test_sincronizacao_falha_encerra(self):
        resultado = MagicMock(
            mensagem="erro sefaz",
            ciclos_executados=0,
            documentos_novos=0,
            documentos_duplicados=0,
            ultimo_cstat="999",
            ultimo_nsu="0",
            max_nsu="0",
            erros_importacao=[],
            sucesso=False,
        )
        with patch(
            "apps.fiscal.management.commands.fiscal_sync_nsu.executar_sincronizacao_nsu",
            return_value=resultado,
        ):
            with pytest.raises(SystemExit) as exc:
                call_command("fiscal_sync_nsu")
        assert exc.value.code == 1
