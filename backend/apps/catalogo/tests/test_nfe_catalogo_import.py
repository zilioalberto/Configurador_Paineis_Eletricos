import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalogo.models import Produto
from apps.cadastros.models import ParceiroComercial
from apps.fiscal.models import ItemFiscalProduto
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices
from core.choices.usuarios import TipoUsuarioChoices
from apps.catalogo.services.nfe_catalogo_parser import parse_nfe_xml_bytes

User = get_user_model()

XML_MINIMO = b"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe35200123456789012345678901234567890123456123">
      <ide>
        <nNF>100</nNF>
        <serie>1</serie>
        <dhEmi>2024-01-15T10:00:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Fornecedor XML Teste LTDA</xNome>
        <xFant>F XML</xFant>
        <IE>123456789</IE>
        <enderEmit>
          <xLgr>Rua Teste</xLgr>
          <nro>100</nro>
          <xBairro>Centro</xBairro>
          <cMun>3550308</cMun>
          <xMun>Sao Paulo</xMun>
          <UF>SP</UF>
          <CEP>01310100</CEP>
        </enderEmit>
      </emit>
      <det nItem="1">
        <prod>
          <cProd>FAB-001</cProd>
          <cEAN>SEM GTIN</cEAN>
          <xProd>Produto linha importacao</xProd>
          <NCM>85444200</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>10.5000</vUnCom>
        </prod>
        <imposto>
          <ICMS>
            <ICMS00>
              <orig>0</orig>
              <CST>00</CST>
              <modBC>3</modBC>
              <vBC>52.50</vBC>
              <pICMS>18.0000</pICMS>
              <vICMS>9.45</vICMS>
            </ICMS00>
          </ICMS>
          <PIS>
            <PISAliq>
              <CST>01</CST>
              <vBC>52.50</vBC>
              <pPIS>1.6500</pPIS>
              <vPIS>0.87</vPIS>
            </PISAliq>
          </PIS>
          <COFINS>
            <COFINSAliq>
              <CST>01</CST>
              <vBC>52.50</vBC>
              <pCOFINS>7.6000</pCOFINS>
              <vCOFINS>3.99</vCOFINS>
            </COFINSAliq>
          </COFINS>
        </imposto>
      </det>
    </infNFe>
  </NFe>
</nfeProc>
"""


def _auth_client(email: str, password: str) -> APIClient:
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def admin_client():
    raw = "nfe-import-pass-12345"
    user = User.objects.create_user(
        email="nfe-import-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
class TestNfeCatalogoParser:
    def test_parse_extrai_emitente_e_itens(self):
        data = parse_nfe_xml_bytes(XML_MINIMO)
        assert data["identificacao"]["numero"] == "100"
        assert data["emitente"]["cnpj"] == "12345678000199"
        assert data["emitente"]["cadastro_fornecedor_disponivel"] is True
        assert len(data["itens"]) == 1
        assert data["itens"][0]["c_prod"] == "FAB-001"
        assert data["itens"][0]["ncm"] == "85444200"
        assert data["itens"][0]["cfop"] == "5102"
        imp = data["itens"][0]["imposto"]
        assert imp["cst_icms"] == "00"
        assert imp["orig"] == "0"
        assert imp["v_icms"] == "9.45"
        assert imp["cst_pis"] == "01"
        assert data["itens"][0]["unidade_catalogo"] == "UN"

    @pytest.mark.parametrize(
        "u_com,esperado",
        [
            ("KG", "KG"),
            (" kg ", "KG"),
            ("KILOGRAMA", "KG"),
            ("M2", "M2"),
            ("MT2", "M2"),
            ("L", "L"),
            ("LITRO", "L"),
            ("PÇ", "PC"),
            ("PECA", "PC"),
            ("METRO", "MT"),
            ("CX", "UN"),
        ],
    )
    def test_parse_ucom_mapeia_unidade_catalogo(self, u_com, esperado):
        xml = XML_MINIMO.replace(b"<uCom>UN</uCom>", f"<uCom>{u_com}</uCom>".encode())
        data = parse_nfe_xml_bytes(xml)
        assert data["itens"][0]["unidade_catalogo"] == esperado
        assert data["itens"][0]["u_com"] == u_com.strip() if u_com.strip() else u_com


@pytest.mark.django_db
class TestNfeCatalogoApi:
    def test_preview_retorna_snapshot(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-nfe-preview")
        f = SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")
        r = client.post(url, {"arquivo": f}, format="multipart")
        assert r.status_code == 200
        body = r.json()
        assert "snapshot" in body
        assert body["snapshot"]["emitente"]["razao_social"] == "Fornecedor XML Teste LTDA"
        assert body["snapshot"]["itens"][0].get("produto_existente") is None

    def test_preview_inclui_produto_existente_quando_codigo_casa(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="12345678000199",
            razao_social="Fornecedor XML Teste LTDA",
            eh_fornecedor=True,
        )
        Produto.objects.create(
            codigo="FAB-001",
            descricao="Descricao antiga",
            categoria=CategoriaProdutoNomeChoices.PLC,
            unidade_medida=UnidadeMedidaChoices.UN,
            fabricante_parceiro=fornecedor,
            fabricante=fornecedor.razao_social.upper(),
        )
        url = reverse("catalogo-nfe-preview")
        f = SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")
        r = client.post(url, {"arquivo": f}, format="multipart")
        assert r.status_code == 200
        ex = r.json()["snapshot"]["itens"][0]["produto_existente"]
        assert ex is not None
        assert ex["codigo"] == "FAB-001"
        assert ex["categoria"] == CategoriaProdutoNomeChoices.PLC

    def test_produto_resumo_por_codigo(self, admin_client):
        client, _ = admin_client
        Produto.objects.create(
            codigo="X-99",
            descricao="X",
            categoria=CategoriaProdutoNomeChoices.OUTROS,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        r = client.get(reverse("catalogo-nfe-produto-resumo"), {"codigo": "x-99"})
        assert r.status_code == 200
        assert r.json()["produto"]["codigo"] == "X-99"

    def test_aplicar_produto_existente_sem_atualizar_vai_para_ignorados(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="12345678000199",
            razao_social="Fornecedor XML Teste LTDA",
            eh_fornecedor=True,
        )
        Produto.objects.create(
            codigo="FAB-001",
            descricao="Outra descricao",
            categoria=CategoriaProdutoNomeChoices.PLC,
            unidade_medida=UnidadeMedidaChoices.UN,
            fabricante_parceiro=fornecedor,
            fabricante=fornecedor.razao_social.upper(),
        )
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]
        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "fornecedor_id": str(fornecedor.id),
                        "categoria_catalogo": CategoriaProdutoNomeChoices.PLC,
                        "atualizar_se_existir": False,
                    }
                ],
            },
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["produtos_criados"] == []
        assert body["produtos_atualizados"] == []
        assert any("Código já existe" in x.get("motivo", "") for x in body["produtos_ignorados"])

    def test_aplicar_produto_existente_com_atualizar_atualiza_campos(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="12345678000199",
            razao_social="Fornecedor XML Teste LTDA",
            eh_fornecedor=True,
        )
        Produto.objects.create(
            codigo="FAB-001",
            descricao="Outra descricao",
            categoria=CategoriaProdutoNomeChoices.PLC,
            unidade_medida=UnidadeMedidaChoices.UN,
            fabricante_parceiro=fornecedor,
            fabricante=fornecedor.razao_social.upper(),
        )
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]
        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "fornecedor_id": str(fornecedor.id),
                        "categoria_catalogo": CategoriaProdutoNomeChoices.PLC,
                        "atualizar_se_existir": True,
                    }
                ],
            },
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert "FAB-001" in body["produtos_atualizados"]
        produto = Produto.objects.get(codigo="FAB-001")
        assert "linha importacao" in produto.descricao.lower()

    def test_lista_fornecedores_para_combo(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="99887766000155",
            razao_social="Fornecedor Cadastrado LTDA",
            eh_fornecedor=True,
        )

        r = client.get(reverse("catalogo-nfe-fornecedores"), {"search": "Cadastrado"})

        assert r.status_code == 200
        assert r.json() == [
            {
                "id": str(fornecedor.id),
                "razao_social": "Fornecedor Cadastrado LTDA",
                "cnpj": "99887766000155",
            }
        ]

    def test_aplicar_cria_produto_e_fornecedor(self, admin_client):
        client, _ = admin_client
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        assert prev.status_code == 200
        snapshot = prev.json()["snapshot"]

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "criar_fornecedor": True,
                "categoria_padrao": CategoriaProdutoNomeChoices.OUTROS,
                "fabricante_padrao": "",
                "objetivo_entrada": "INDUSTRIALIZACAO",
                "itens": [{"n_item": 1, "importar": True}],
            },
            format="json",
        )
        assert r.status_code == 200
        body = r.json()
        assert body["fornecedor_criado"] is True
        assert "FAB-001" in body["produtos_criados"]
        fornecedor = ParceiroComercial.objects.get(documento="12345678000199")
        produto = Produto.objects.get(codigo="FAB-001")
        assert produto.fornecedor_parceiro == fornecedor
        assert produto.fabricante_parceiro == fornecedor
        assert produto.fabricante == fornecedor.razao_social.upper()
        assert produto.origem_mercadoria == "0"
        item = ItemFiscalProduto.objects.get(produto=produto)
        assert item.objetivo_entrada == "INDUSTRIALIZACAO"
        assert item.cfop == "5102"
        assert item.cst_icms == "00"
        assert item.n_item_nfe == 1
        assert produto.unidade_medida == UnidadeMedidaChoices.UN

    def test_aplicar_importa_unidade_medida_do_ucom(self, admin_client):
        client, _ = admin_client
        xml_kg = XML_MINIMO.replace(b"<uCom>UN</uCom>", b"<uCom>KG</uCom>")
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", xml_kg, content_type="application/xml")},
            format="multipart",
        )
        assert prev.status_code == 200
        snapshot = prev.json()["snapshot"]
        assert snapshot["itens"][0]["unidade_catalogo"] == UnidadeMedidaChoices.KG

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "criar_fornecedor": True,
                "categoria_padrao": CategoriaProdutoNomeChoices.OUTROS,
                "fabricante_padrao": "",
                "itens": [{"n_item": 1, "importar": True}],
            },
            format="json",
        )
        assert r.status_code == 200
        produto = Produto.objects.get(codigo="FAB-001")
        assert produto.unidade_medida == UnidadeMedidaChoices.KG

    def test_aplicar_usa_categoria_e_fornecedor_por_item(self, admin_client):
        client, _ = admin_client
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "criar_fornecedor": True,
                        "categoria_catalogo": CategoriaProdutoNomeChoices.CABO,
                    }
                ],
            },
            format="json",
        )

        assert r.status_code == 200
        body = r.json()
        assert body["fornecedor_criado"] is True
        produto = Produto.objects.get(codigo="FAB-001")
        assert produto.categoria == CategoriaProdutoNomeChoices.CABO
        assert produto.fornecedor_parceiro == ParceiroComercial.objects.get(
            documento="12345678000199"
        )
        assert produto.fabricante_parceiro == ParceiroComercial.objects.get(
            documento="12345678000199"
        )

    def test_aplicar_associa_fornecedor_existente_por_item(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="11222333000144",
            razao_social="Fornecedor Alternativo LTDA",
            eh_fornecedor=True,
        )
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "fornecedor_id": str(fornecedor.id),
                        "categoria_catalogo": CategoriaProdutoNomeChoices.CABO,
                    }
                ],
            },
            format="json",
        )

        assert r.status_code == 200
        body = r.json()
        assert body["fornecedor_criado"] is False
        assert body["fornecedor_id"] == str(fornecedor.id)
        assert body["fornecedor_ids"] == [str(fornecedor.id)]
        produto = Produto.objects.get(codigo="FAB-001")
        assert produto.fornecedor_parceiro == fornecedor
        assert produto.fabricante_parceiro == fornecedor
        assert produto.fabricante == fornecedor.razao_social.upper()
        assert not ParceiroComercial.objects.filter(documento="12345678000199").exists()

    def test_aplicar_permitem_fabricante_diferente_por_item(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="11222333000144",
            razao_social="Fornecedor Alternativo LTDA",
            eh_fornecedor=True,
        )
        fabricante = ParceiroComercial.objects.create(
            documento="55666777000188",
            razao_social="Fabricante Dedicado LTDA",
            eh_fornecedor=True,
        )
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "fornecedor_id": str(fornecedor.id),
                        "fabricante_id": str(fabricante.id),
                        "categoria_catalogo": CategoriaProdutoNomeChoices.CABO,
                    }
                ],
            },
            format="json",
        )

        assert r.status_code == 200
        produto = Produto.objects.get(codigo="FAB-001")
        assert produto.fornecedor_parceiro == fornecedor
        assert produto.fabricante_parceiro == fabricante
        assert produto.fabricante == fabricante.razao_social.upper()

    def test_aplicar_exige_categoria_para_item_marcado(self, admin_client):
        client, _ = admin_client
        prev = client.post(
            reverse("catalogo-nfe-preview"),
            {"arquivo": SimpleUploadedFile("nf.xml", XML_MINIMO, content_type="application/xml")},
            format="multipart",
        )
        snapshot = prev.json()["snapshot"]

        r = client.post(
            reverse("catalogo-nfe-aplicar"),
            {
                "snapshot": snapshot,
                "fabricante_padrao": "",
                "itens": [
                    {
                        "n_item": 1,
                        "importar": True,
                        "criar_fornecedor": True,
                    }
                ],
            },
            format="json",
        )

        assert r.status_code == 400
        assert "Categoria obrigatória para o item 1" in str(r.json()["detail"])
