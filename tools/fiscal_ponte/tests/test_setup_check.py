from unittest.mock import MagicMock, patch

from fiscal_ponte.config import PonteConfig
from fiscal_ponte.setup_check import executar_setup_check, todos_ok


def _config_ok() -> PonteConfig:
    return PonteConfig(
        api_base_url="http://test/api/v1",
        agent_token="secret",
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


@patch("fiscal_ponte.setup_check.FiscalApiClient")
@patch("fiscal_ponte.setup_check.load_env_file", return_value=None)
def test_setup_check_stub_ok(mock_env, mock_api_cls):
    mock_api = MagicMock()
    mock_api_cls.return_value = mock_api
    mock_api.get_controle_nsu.return_value = MagicMock(
        ultimo_nsu="000000000000000", ultimo_cstat=""
    )
    checks = executar_setup_check(_config_ok(), verificar_env=False)
    assert todos_ok(checks)
