import httpx
import pytest

from fiscal_ponte.http_retry import chamar_com_retry


def test_nao_repete_400():
    chamadas = 0

    def op():
        nonlocal chamadas
        chamadas += 1
        req = httpx.Request("GET", "http://test/")
        resp = httpx.Response(400, request=req)
        raise httpx.HTTPStatusError("bad", request=req, response=resp)

    with pytest.raises(httpx.HTTPStatusError):
        chamar_com_retry(op, max_tentativas=3, base_delay_sec=0.01)
    assert chamadas == 1


def test_repete_503():
    chamadas = 0

    def op():
        nonlocal chamadas
        chamadas += 1
        if chamadas < 2:
            req = httpx.Request("GET", "http://test/")
            resp = httpx.Response(503, request=req)
            raise httpx.HTTPStatusError("down", request=req, response=resp)
        return "ok"

    assert chamar_com_retry(op, max_tentativas=3, base_delay_sec=0.01) == "ok"
    assert chamadas == 2
