from unittest.mock import mock_open, patch


def test_regenerate_catalogo_json_builders_e_write(monkeypatch):
    from scripts import regenerate_catalogo_json as script

    monkeypatch.setattr(script, "FRONTEND_DATA_DIR", "frontend-data")

    choice_options = script.build_choice_class_options()
    spec_fields = script.build_spec_field_list()
    field_choices = script.build_categoria_field_choice_options()

    assert "TipoFiltroArChoices" in choice_options
    assert "PAINEL" in spec_fields
    assert any(field["name"] == "tipo_painel" for field in spec_fields["PAINEL"])
    assert "PAINEL" in field_choices

    m_open = mock_open()
    with patch("builtins.open", m_open):
        script.write_json("saida.json", {"ok": True})

    m_open.assert_called_once()
    handle = m_open()
    handle.write.assert_any_call("\n")
