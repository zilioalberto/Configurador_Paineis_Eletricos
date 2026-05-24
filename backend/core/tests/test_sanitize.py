from core.security.sanitize import sanitize_email, sanitize_text


class TestSanitizeText:
    def test_remove_script_e_html(self):
        raw = '<script>alert("x")</script>Empresa <b>Teste</b> LTDA'
        assert sanitize_text(raw, max_length=255) == 'Empresa Teste LTDA'

    def test_remove_caracteres_de_controle(self):
        assert sanitize_text("A\x00B\x07C", max_length=10) == "ABC"

    def test_limita_tamanho(self):
        assert len(sanitize_text("x" * 300, max_length=20)) == 20


class TestSanitizeEmail:
    def test_email_valido(self):
        assert sanitize_email(" Contato@Empresa.COM ") == "contato@empresa.com"

    def test_email_invalido_vira_vazio(self):
        assert sanitize_email("nao-e-email") == ""
