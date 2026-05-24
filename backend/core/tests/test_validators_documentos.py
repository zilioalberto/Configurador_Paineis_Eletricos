import pytest

from core.validators.documentos import DocumentoInvalidoError, validar_cnpj_digitos


class TestValidarCnpj:
    def test_cnpj_valido(self):
        assert validar_cnpj_digitos("19.131.243/0001-97") == "19131243000197"

    def test_rejeita_tamanho_incorreto(self):
        with pytest.raises(DocumentoInvalidoError, match="14 digitos"):
            validar_cnpj_digitos("123")

    def test_rejeita_digitos_iguais(self):
        with pytest.raises(DocumentoInvalidoError, match="invalido"):
            validar_cnpj_digitos("11111111111111")

    def test_rejeita_digito_verificador_invalido(self):
        with pytest.raises(DocumentoInvalidoError, match="verificadores"):
            validar_cnpj_digitos("19131243000100")


class TestValidarCpf:
    def test_cpf_valido(self):
        from core.validators.documentos import validar_cpf_digitos

        assert validar_cpf_digitos("390.533.447-05") == "39053344705"

    def test_rejeita_cpf_invalido(self):
        from core.validators.documentos import validar_cpf_digitos

        with pytest.raises(DocumentoInvalidoError):
            validar_cpf_digitos("12345678901")
