from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from fiscal_ponte.api_client import ControleNsuRemoto, ImportarXmlResultado
from fiscal_ponte.config import PonteConfig
from fiscal_ponte.sefaz.base import DistDfeDocumento, DistDfeResultado
from fiscal_ponte.sync_cycle import executar_ciclo_sincronizacao


def _config_stub() -> PonteConfig:
    return PonteConfig(
        api_base_url="http://test/api/v1",
        agent_token="token-test",
        cnpj="98765432000188",
        uf="35",
        sefaz_provider="stub",
        acbr_host="127.0.0.1",
        acbr_port=3434,
        acbr_timeout_sec=30,
        acbr_output_dir=None,
        folder_xml=None,
        max_ciclos_nsu=5,
        api_retry_max=1,
        api_retry_base_sec=0.1,
        sync_interval_min=15,
    )


@patch("fiscal_ponte.sync_cycle.FiscalApiClient")
@patch("fiscal_ponte.sync_cycle.build_sefaz_provider")
def test_ciclo_stub_atualiza_nsu(mock_build, mock_api_cls):
    mock_api = MagicMock()
    mock_api_cls.return_value = mock_api
    mock_api.get_controle_nsu.return_value = ControleNsuRemoto(
        cnpj="98765432000188",
        ultimo_nsu="000000000000000",
        max_nsu=None,
        ultimo_cstat="",
        ultimo_motivo="",
        bloqueado_ate=None,
        ultima_consulta=None,
    )
    mock_build.return_value.distribuicao_por_ult_nsu.return_value = DistDfeResultado(
        cstat="137",
        xmotivo="vazio",
        ultimo_nsu="000000000000000",
        max_nsu="000000000000000",
    )

    result = executar_ciclo_sincronizacao(_config_stub())
    assert result.sucesso is True
    mock_api.patch_controle_nsu.assert_called_once()
    payload = mock_api.patch_controle_nsu.call_args[0][1]
    assert payload["ultimo_cstat"] == "137"


@patch("fiscal_ponte.sync_cycle.FiscalApiClient")
@patch("fiscal_ponte.sync_cycle.build_sefaz_provider")
def test_ciclo_importa_documentos(mock_build, mock_api_cls):
    mock_api = MagicMock()
    mock_api_cls.return_value = mock_api
    mock_api.get_controle_nsu.return_value = ControleNsuRemoto(
        cnpj="98765432000188",
        ultimo_nsu="000000000000000",
        max_nsu=None,
        ultimo_cstat="",
        ultimo_motivo="",
        bloqueado_ate=None,
        ultima_consulta=None,
    )
    mock_build.return_value.distribuicao_por_ult_nsu.return_value = DistDfeResultado(
        cstat="138",
        xmotivo="ok",
        ultimo_nsu="000000000000001",
        max_nsu="000000000000001",
        documentos=[DistDfeDocumento(xml="<nfeProc/>", nsu="000000000000001")],
    )
    mock_api.importar_xml.return_value = ImportarXmlResultado(
        created=True,
        message="ok",
        documento_id=1,
        chave_acesso="x",
    )

    result = executar_ciclo_sincronizacao(_config_stub())
    assert result.documentos_novos == 1
    mock_api.importar_xml.assert_called_once()


@patch("fiscal_ponte.sync_cycle.FiscalApiClient")
def test_bloqueado_nao_consulta(mock_api_cls):
    mock_api = MagicMock()
    mock_api_cls.return_value = mock_api
    futuro = datetime.now(timezone.utc).replace(year=2099)
    mock_api.get_controle_nsu.return_value = ControleNsuRemoto(
        cnpj="98765432000188",
        ultimo_nsu="000000000000000",
        max_nsu=None,
        ultimo_cstat="656",
        ultimo_motivo="bloqueio",
        bloqueado_ate=futuro,
        ultima_consulta=None,
    )

    result = executar_ciclo_sincronizacao(_config_stub())
    assert result.sucesso is False
    mock_api.patch_controle_nsu.assert_not_called()
