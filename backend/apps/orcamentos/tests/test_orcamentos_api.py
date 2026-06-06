import secrets
import tempfile
import zipfile

import pytest
from io import BytesIO
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cadastros.models import ContatoParceiro, ParceiroComercial
from apps.catalogo.models import Produto, Servico
from apps.configurador_paineis.cargas.models import (
    Carga,
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.fiscal.models import ItemFiscalProduto
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    ModoConfiguradorPainelChoices,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoOfertaBloco,
    OrcamentoItem,
    OrcamentoSnapshot,
    OrigemItemOrcamentoChoices,
    PerfilOfertaChoices,
    StatusOrcamentoChoices,
    TipoBlocoOfertaChoices,
    TipoItemOrcamentoChoices,
)
from core.choices import (
    NumeroFasesChoices,
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
    TipoProtecaoValvulaChoices,
    TipoSensorChoices,
    TipoSinalChoices,
    TipoSinaisAnalogicosChoices,
    TipoTransdutorChoices,
    TipoValvulaChoices,
    TensaoChoices,
)
from core.permissions import PermissionKeys


def _codigo_rev(base: str, revisao: str) -> str:
    return f"{base} Rev {revisao}"


def test_proxima_revisao_label_inicial_e_sequencia():
    from apps.orcamentos.services.revisao_orcamento import proxima_revisao_label

    assert proxima_revisao_label("") == "A"
    assert proxima_revisao_label("A") == "B"
    assert proxima_revisao_label("B") == "C"
from core.choices.produtos import CategoriaProdutoNomeChoices

User = get_user_model()


def _auth_client(user, password):
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.mark.django_db
def test_create_orcamento_gera_codigo_e_vincula_cliente_contato(
    user_admin,
    cliente_com_contato,
):
    user, raw = user_admin
    cliente, contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Proposta de painel",
            "cliente": str(cliente.id),
            "contato_cliente": str(contato.id),
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    body = resp.json()
    base = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    assert body["codigo"] == base
    assert body["codigo_base"] == base
    assert body["revisao"] == ""
    assert body["cliente"] == str(cliente.id)
    assert body["cliente_nome"] == "Cliente Proposta LTDA"
    assert body["contato_cliente"] == str(contato.id)
    orcamento = Orcamento.objects.get(pk=body["id"])
    assert orcamento.cliente == cliente
    assert orcamento.contato_cliente == contato
    assert orcamento.criado_por_id == user.id
    assert orcamento.atualizado_por_id == user.id


@pytest.mark.django_db
def test_patch_orcamento_atualiza_atualizado_por(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-AUDIT", titulo="Audit", status=StatusOrcamentoChoices.RASCUNHO
    )
    assert orc.criado_por_id is None
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(url, {"titulo": "Audit 2"}, format="json")
    assert resp.status_code == 200, resp.content
    orc.refresh_from_db()
    assert orc.atualizado_por_id == user.id


@pytest.mark.django_db
def test_patch_orcamento_exige_permissao_editar():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="orcamentos-sem-editar@test.com",
        password=raw,
        is_active=True,
        permissoes_extras=[PermissionKeys.ORCAMENTO_VISUALIZAR],
    )
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-PERM", titulo="Permissão", status=StatusOrcamentoChoices.RASCUNHO
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"titulo": "Sem permissão"}, format="json")

    assert resp.status_code == 403, resp.content
    assert "permiss" in resp.json()["detail"].lower()


@pytest.mark.django_db
def test_patch_orcamento_desconto_exige_permissao_dedicada(cliente_com_contato):
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="orcamentos-sem-desconto@test.com",
        password=raw,
        is_active=True,
        permissoes_extras=[
            PermissionKeys.ORCAMENTO_VISUALIZAR,
            PermissionKeys.ORCAMENTO_EDITAR,
        ],
    )
    client = _auth_client(user, raw)
    cliente, _contato = cliente_com_contato
    orc = Orcamento.objects.create(
        codigo_base="O-DESC-PERM",
        titulo="Desconto",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(
        url,
        {"desconto_comercial_ativo": True, "desconto_percentual": "5.00"},
        format="json",
    )

    assert resp.status_code == 400, resp.content
    assert "desconto" in str(resp.data).lower()


@pytest.mark.django_db
def test_patch_orcamento_desconto_com_permissao(user_admin, cliente_com_contato):
    user, raw = user_admin
    client = _auth_client(user, raw)
    cliente, _contato = cliente_com_contato
    orc = Orcamento.objects.create(
        codigo_base="O-DESC-OK",
        titulo="Desconto OK",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(
        url,
        {"desconto_comercial_ativo": True, "desconto_percentual": "5.00"},
        format="json",
    )

    assert resp.status_code == 200, resp.content
    orc.refresh_from_db()
    assert orc.desconto_comercial_ativo is True
    assert orc.desconto_percentual == Decimal("5.00")


@pytest.mark.django_db
def test_patch_orcamento_enviado_cria_snapshot_imutavel(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-SNAP",
        titulo="Snapshot",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto enviado",
        quantidade=Decimal("2"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"status": StatusOrcamentoChoices.ENVIADO}, format="json")

    assert resp.status_code == 200, resp.content
    snapshot = OrcamentoSnapshot.objects.get(orcamento=orc)
    assert snapshot.codigo == orc.codigo
    assert snapshot.total == Decimal("240.0000")
    assert snapshot.gerado_por_id == user.id
    assert snapshot.itens[0]["id"] == str(item.id)
    assert snapshot.itens[0]["preco_unitario"] == "120.0000"
    assert resp.json()["snapshot_envio"]["total"] == "240.0000"

    OrcamentoItem.objects.filter(pk=item.pk).update(preco_unitario=Decimal("999"))
    resp2 = client.patch(url, {"status": StatusOrcamentoChoices.APROVADO}, format="json")
    assert resp2.status_code == 200, resp2.content
    snapshot.refresh_from_db()
    assert OrcamentoSnapshot.objects.filter(orcamento=orc).count() == 1
    assert snapshot.itens[0]["preco_unitario"] == "120.0000"


@pytest.mark.django_db
def test_patch_orcamento_salva_blocos_textuais_e_perfil_oferta(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-BLOCOS",
        titulo="Oferta completa",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(
        url,
        {
            "perfil_oferta": PerfilOfertaChoices.SOLUCAO_COMPLETA,
            "oferta_blocos": [
                {
                    "ordem": 0,
                    "tipo": TipoBlocoOfertaChoices.ESCOPO,
                    "titulo": "Escopo de fornecimento",
                    "conteudo": "Sistema de controle para climatização.",
                },
                {
                    "ordem": 1,
                    "tipo": TipoBlocoOfertaChoices.EXCLUSOES,
                    "titulo": "Exclusões",
                    "conteudo": "Instalação em campo.",
                },
            ],
        },
        format="json",
    )

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["perfil_oferta"] == PerfilOfertaChoices.SOLUCAO_COMPLETA
    assert [b["titulo"] for b in body["oferta_blocos"]] == [
        "Escopo de fornecimento",
        "Exclusões",
    ]
    orc.refresh_from_db()
    assert orc.perfil_oferta == PerfilOfertaChoices.SOLUCAO_COMPLETA
    assert OrcamentoOfertaBloco.objects.filter(orcamento=orc).count() == 2


@pytest.mark.django_db
def test_snapshot_congela_textos_da_oferta_completa(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-SNAP-TEXTO",
        titulo="Snapshot textos",
        perfil_oferta=PerfilOfertaChoices.SOLUCAO_COMPLETA,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoOfertaBloco.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoBlocoOfertaChoices.ESCOPO,
        titulo="Escopo de fornecimento",
        conteudo="Fornecimento de painel elétrico e software de controle.",
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Painel elétrico",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("30"),
        preco_unitario=Decimal("130"),
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"status": StatusOrcamentoChoices.FINALIZADO}, format="json")

    assert resp.status_code == 200, resp.content
    snapshot = OrcamentoSnapshot.objects.get(orcamento=orc)
    assert snapshot.dados["perfil_oferta"] == PerfilOfertaChoices.SOLUCAO_COMPLETA
    assert snapshot.dados["oferta_blocos"][0]["tipo"] == TipoBlocoOfertaChoices.ESCOPO
    assert (
        snapshot.dados["oferta_blocos"][0]["conteudo"]
        == "Fornecimento de painel elétrico e software de controle."
    )


@pytest.mark.django_db
def test_preview_oferta_materiais_mostra_itens_unitarios(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, contato = cliente_com_contato
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-PREV-MAT",
        titulo="Materiais Siemens",
        cliente=cliente,
        contato_cliente=contato,
        perfil_oferta=PerfilOfertaChoices.MATERIAIS,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Disjuntor Siemens",
        quantidade=Decimal("2"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )

    resp = client.get(reverse("erp-orcamento-preview-oferta", kwargs={"pk": orc.pk}))

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["codigo_base"] == "O-PREV-MAT"
    assert " Rev " not in body["codigo_base"]
    assert body["perfil_oferta"] == PerfilOfertaChoices.MATERIAIS
    assert body["cliente"]["nome"] == cliente.razao_social
    assert body["investimento"]["modo"] == "ITENS_UNITARIOS"
    assert body["investimento"]["itens"][0]["descricao"] == "Disjuntor Siemens"
    assert body["investimento"]["itens"][0]["preco_unitario"] == "120"
    assert body["totais"]["total"] == "240"
    assert body["emissao"]
    assert body["apendice_legal"]["versao"]
    assert len(body["apendice_legal"]["secoes"]) >= 1


@pytest.mark.django_db
def test_preview_oferta_solucao_completa_consolida_investimento(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-PREV-SOL",
        titulo="Automação sala de impressão",
        perfil_oferta=PerfilOfertaChoices.SOLUCAO_COMPLETA,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoOfertaBloco.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoBlocoOfertaChoices.ESCOPO,
        titulo="Escopo de fornecimento",
        conteudo="Fornecimento de painel elétrico e software.",
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Painel elétrico",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("25"),
        preco_unitario=Decimal("125"),
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        tipo=TipoItemOrcamentoChoices.SERVICO,
        descricao="Programação PLC",
        quantidade=Decimal("10"),
        custo_unitario=Decimal("50"),
        margem_percentual=Decimal("30"),
        preco_unitario=Decimal("65"),
    )

    resp = client.get(reverse("erp-orcamento-preview-oferta", kwargs={"pk": orc.pk}))

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["perfil_oferta"] == PerfilOfertaChoices.SOLUCAO_COMPLETA
    assert body["secoes"][0]["titulo"] == "Escopo de fornecimento"
    assert body["investimento"]["modo"] == "CONSOLIDADO"
    assert len(body["investimento"]["itens"]) == 1
    assert body["investimento"]["itens"][0]["subtotal"] == "775"
    assert body["totais"]["produtos"] == "125"
    assert body["totais"]["servicos"] == "650"
    assert body["totais"]["total"] == "775"
    assert body["totais"]["desconto_ativo"] is False


@pytest.mark.django_db
def test_gerar_docx_oferta_retorna_documento_editavel(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, contato = cliente_com_contato
    cliente.razao_social = "CLIENTE PROPOSTA LTDA"
    cliente.save(update_fields=("razao_social",))
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-DOCX",
        titulo="Painel de automacao",
        cliente=cliente,
        contato_cliente=contato,
        perfil_oferta=PerfilOfertaChoices.SOLUCAO_COMPLETA,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoOfertaBloco.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoBlocoOfertaChoices.ESCOPO,
        titulo="Escopo de fornecimento",
        conteudo="Fornecimento de painel eletrico e software.",
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Painel eletrico",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("25"),
        preco_unitario=Decimal("125"),
    )

    resp = client.get(reverse("erp-orcamento-gerar-docx-oferta", kwargs={"pk": orc.pk}))

    assert resp.status_code == 200, resp.content
    assert resp["Content-Type"] == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
    assert resp.content.startswith(b"PK")
    with zipfile.ZipFile(BytesIO(resp.content)) as docx:
        media_files = [name for name in docx.namelist() if name.startswith("word/media/")]
        document_xml = docx.read("word/document.xml").decode("utf-8")
    meses = (
        "janeiro",
        "fevereiro",
        "março",
        "abril",
        "maio",
        "junho",
        "julho",
        "agosto",
        "setembro",
        "outubro",
        "novembro",
        "dezembro",
    )
    hoje = timezone.localdate()
    data_extenso = f"{hoje.day:02d} de {meses[hoje.month - 1]} de {hoje.year}"
    assert media_files
    assert "PROPOSTA TÉCNICA E COMERCIAL" in document_xml
    assert "Cliente Proposta LTDA" in document_xml
    assert "CLIENTE PROPOSTA LTDA" not in document_xml
    assert document_xml.count(data_extenso) == 1
    assert "Fornecimento de painel eletrico e software." in document_xml
    assert "Valor Unit." in document_xml
    assert "Valor Total" in document_xml
    assert "Total da oferta" in document_xml
    assert "R$ 125,00" in document_xml
    assert "{{" not in document_xml


@pytest.mark.django_db
def test_upload_arquivos_oferta_e_marca_envio(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, contato = cliente_com_contato
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-ENVIO",
        titulo="Painel final",
        cliente=cliente,
        contato_cliente=contato,
        status=StatusOrcamentoChoices.FINALIZADO,
    )

    with tempfile.TemporaryDirectory() as media_root, override_settings(
        MEDIA_ROOT=media_root
    ):
        docx_resp = client.post(
            reverse("erp-orcamento-arquivo-oferta-list", kwargs={"pk": orc.pk}),
            {
                "tipo": "DOCX_REVISADO",
                "arquivo": SimpleUploadedFile(
                    "oferta-revisada.docx",
                    b"docx",
                    content_type=(
                        "application/vnd.openxmlformats-officedocument."
                        "wordprocessingml.document"
                    ),
                ),
            },
            format="multipart",
        )
        pdf_resp = client.post(
            reverse("erp-orcamento-arquivo-oferta-list", kwargs={"pk": orc.pk}),
            {
                "tipo": "PDF_FINAL",
                "arquivo": SimpleUploadedFile(
                    "oferta-final.pdf",
                    b"%PDF-1.4",
                    content_type="application/pdf",
                ),
            },
            format="multipart",
        )

    assert docx_resp.status_code == 201, docx_resp.content
    assert pdf_resp.status_code == 201, pdf_resp.content
    assert len(pdf_resp.json()["oferta_arquivos"]) == 2

    enviar_resp = client.post(
        reverse("erp-orcamento-marcar-oferta-enviada", kwargs={"pk": orc.pk}),
        {
            "destinatario_nome": "Compras Cliente",
            "destinatario_email": "compras@cliente.com",
            "assunto": "Proposta técnica e comercial",
        },
        format="json",
    )

    assert enviar_resp.status_code == 200, enviar_resp.content
    body = enviar_resp.json()
    assert body["status"] == StatusOrcamentoChoices.ENVIADO
    assert len(body["oferta_envios"]) == 1
    assert body["oferta_envios"][0]["pdf_final"]["nome_original"] == "oferta-final.pdf"


@pytest.mark.django_db
def test_gerar_blocos_padrao_oferta_solucao_completa(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    cliente.razao_social = "CLIENTE PROPOSTA LTDA"
    cliente.save(update_fields=("razao_social",))
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-BLOCOS-PADRAO",
        titulo="Automação climatização",
        descricao="sistema de controle para climatização",
        cliente=cliente,
        perfil_oferta=PerfilOfertaChoices.MATERIAIS,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="PLC Siemens S7-1200",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        tipo=TipoItemOrcamentoChoices.SERVICO,
        descricao="Programação de software PLC",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("300"),
        margem_percentual=Decimal("30"),
        preco_unitario=Decimal("390"),
    )

    resp = client.post(
        reverse("erp-orcamento-gerar-blocos-padrao-oferta", kwargs={"pk": orc.pk}),
        {"perfil_oferta": PerfilOfertaChoices.SOLUCAO_COMPLETA},
        format="json",
    )

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["perfil_oferta"] == PerfilOfertaChoices.SOLUCAO_COMPLETA
    blocos = body["oferta_blocos"]
    assert blocos[1]["tipo"] == TipoBlocoOfertaChoices.ESCOPO
    assert "sistema de controle para climatização" in blocos[1]["conteudo"]
    assert "para Cliente Proposta LTDA" in blocos[1]["conteudo"]
    assert "CLIENTE PROPOSTA LTDA" not in blocos[1]["conteudo"]
    assert "PLC Siemens S7-1200" in blocos[2]["conteudo"]
    assert "Programação de software PLC" in blocos[3]["conteudo"]
    assert OrcamentoOfertaBloco.objects.filter(orcamento=orc).count() == len(blocos)


@pytest.mark.django_db
def test_gerar_blocos_padrao_oferta_usa_cargas_do_configurador(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-BLOCOS-CARGAS",
        titulo="Painel CCM",
        descricao="painel de acionamentos",
        perfil_oferta=PerfilOfertaChoices.MATERIAIS,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    projeto = ProjetoConfigurador.objects.create(
        codigo="CFG-ESCOPO-01",
        nome="Painel CCM",
        cliente="Cliente teste",
        tensao_nominal=TensaoChoices.V380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        possui_neutro=False,
        possui_terra=False,
    )
    OrcamentoConfiguradorPainel.objects.create(
        orcamento=orc,
        projeto_configurador=projeto,
        ordem=0,
        descricao_painel="Painel CCM",
        modo=ModoConfiguradorPainelChoices.ATIVO,
    )
    motor = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor exaustor",
        tipo=TipoCargaChoices.MOTOR,
    )
    CargaMotor.objects.create(
        carga=motor,
        potencia_corrente_valor=Decimal("5.00"),
        potencia_corrente_unidade="CV",
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
        tipo_protecao=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    )
    resistencia = Carga.objects.create(
        projeto=projeto,
        tag="R01",
        descricao="Banco de resistência",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=resistencia,
        potencia_kw=Decimal("12.50"),
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    )
    valvula = Carga.objects.create(
        projeto=projeto,
        tag="YV01",
        descricao="Válvula de entrada",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=valvula,
        tipo_valvula=TipoValvulaChoices.SOLENOIDE,
        quantidade_vias=5,
        quantidade_posicoes=2,
        quantidade_solenoides=2,
        retorno_mola=True,
        possui_feedback=True,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
        tipo_rele_interface="ELETROMECANICA",
        tipo_protecao=TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
    )
    sensor = Carga.objects.create(
        projeto=projeto,
        tag="S01",
        descricao="Sensor de presença",
        tipo=TipoCargaChoices.SENSOR,
    )
    CargaSensor.objects.create(
        carga=sensor,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        tensao_alimentacao=TensaoChoices.V24,
        pnp=True,
        normalmente_aberto=True,
        quantidade_fios=3,
    )
    transdutor = Carga.objects.create(
        projeto=projeto,
        tag="PT01",
        descricao="Transdutor de pressão",
        tipo=TipoCargaChoices.TRANSDUTOR,
    )
    CargaTransdutor.objects.create(
        carga=transdutor,
        tipo_transdutor=TipoTransdutorChoices.PRESSAO,
        faixa_medicao="0-10 bar",
        tipo_sinal_analogico=TipoSinaisAnalogicosChoices.CORRENTE_4_20MA,
        precisao="0,5%",
        tensao_alimentacao=TensaoChoices.V24,
        quantidade_fios=2,
    )

    resp = client.post(
        reverse("erp-orcamento-gerar-blocos-padrao-oferta", kwargs={"pk": orc.pk}),
        {"perfil_oferta": PerfilOfertaChoices.SOLUCAO_COMPLETA},
        format="json",
    )

    assert resp.status_code == 200, resp.content
    blocos = resp.json()["oferta_blocos"]
    escopo = next(b for b in blocos if b["tipo"] == TipoBlocoOfertaChoices.ESCOPO)
    assert (
        "M01 - Acionamento de motor elétrico trifásico com potência de 5 CV via contatora "
        "e proteção via disjuntor motor."
    ) in escopo["conteudo"]
    assert (
        "R01 - Acionamento de banco de resistência trifásico com potência de 12.5 kW "
        "via relé de estado sólido e proteção via fusíveis ultrarrápidos."
    ) in escopo["conteudo"]
    assert (
        "YV01 - Acionamento de válvula solenóide 5/2 vias/posições com 2 solenoide(s) "
        "e retorno por mola com feedback de posição em 24 V CC via relé de interface "
        "e proteção via borne fusível."
    ) in escopo["conteudo"]
    assert (
        "S01 - Monitoramento por sensor indutivo com sinal digital (PNP, NA), "
        "alimentação 24 V CC, 3 fios."
    ) in escopo["conteudo"]
    assert (
        "PT01 - Medição por transdutor de pressão com sinal corrente 4-20 mA, "
        "faixa 0-10 bar, precisão 0,5%, alimentação 24 V CC, 2 fios."
    ) in escopo["conteudo"]


@pytest.mark.django_db
def test_gerar_blocos_padrao_rejeita_orcamento_finalizado(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-BLOCOS-FINAL",
        titulo="Finalizado",
        status=StatusOrcamentoChoices.FINALIZADO,
    )

    resp = client.post(
        reverse("erp-orcamento-gerar-blocos-padrao-oferta", kwargs={"pk": orc.pk}),
        {"perfil_oferta": PerfilOfertaChoices.MATERIAIS},
        format="json",
    )

    assert resp.status_code == 400, resp.content
    assert "rascunho" in resp.json()["detail"].lower()


@pytest.mark.django_db
def test_patch_orcamento_finalizado_congela_sem_enviar(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-FINAL",
        titulo="Finalizar oferta",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto finalizado",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("25"),
        preco_unitario=Decimal("125"),
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"status": StatusOrcamentoChoices.FINALIZADO}, format="json")

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["status"] == StatusOrcamentoChoices.FINALIZADO
    assert body["editavel"] is False
    snapshot = OrcamentoSnapshot.objects.get(orcamento=orc)
    assert snapshot.status_orcamento == StatusOrcamentoChoices.FINALIZADO
    assert snapshot.gerado_por_id == user.id
    assert body["snapshot_envio"]["status_orcamento"] == StatusOrcamentoChoices.FINALIZADO


@pytest.mark.django_db
def test_patch_orcamento_finalizado_rejeita_preco_catalogo_desatualizado(
    user_admin,
    cliente_com_contato,
):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    produto = Produto.objects.create(
        codigo="CAT-VENCIDO-01",
        descricao="Produto vencido",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    Produto.objects.filter(pk=produto.pk).update(
        preco_atualizado_em=timezone.now() - timedelta(days=45)
    )
    orc = Orcamento.objects.create(
        codigo_base="O-PRECO-VENCIDO",
        titulo="Preço vencido",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        produto=produto,
        descricao=produto.descricao,
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )

    resp = client.patch(
        reverse("erp-orcamento-detail", kwargs={"pk": orc.pk}),
        {"status": StatusOrcamentoChoices.FINALIZADO},
        format="json",
    )

    assert resp.status_code == 400
    assert "preço sem revisão" in str(resp.data).lower()
    orc.refresh_from_db()
    assert orc.status == StatusOrcamentoChoices.RASCUNHO
    assert not OrcamentoSnapshot.objects.filter(orcamento=orc).exists()

    detail_resp = client.get(reverse("erp-orcamento-detail", kwargs={"pk": orc.pk}))
    assert detail_resp.status_code == 200, detail_resp.content
    assert detail_resp.json()["itens"][0]["catalogo_preco_desatualizado"] is True
    assert detail_resp.json()["itens"][0]["catalogo_preco_atualizado_em"] is not None


@pytest.mark.django_db
def test_revisar_preco_catalogo_pelo_orcamento_atualiza_catalogo_e_linha(
    user_admin,
    cliente_com_contato,
):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    produto = Produto.objects.create(
        codigo="CAT-REV-001",
        descricao="Produto revisão",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    Produto.objects.filter(pk=produto.pk).update(
        preco_atualizado_em=timezone.now() - timedelta(days=45)
    )
    orc = Orcamento.objects.create(
        codigo_base="O-REV-PRECO",
        titulo="Revisar preço",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        produto=produto,
        descricao=produto.descricao,
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )

    resp = client.post(
        reverse(
            "erp-orcamento-revisar-preco-catalogo-item",
            kwargs={"pk": orc.pk, "item_id": item.pk},
        ),
        {"preco_base": "150.00", "justificativa": "Cotação atualizada do fornecedor."},
        format="json",
    )

    assert resp.status_code == 200, resp.content
    produto.refresh_from_db()
    item.refresh_from_db()
    assert produto.preco_base == Decimal("150.00")
    assert produto.preco_atualizado_em is not None
    assert item.custo_unitario == Decimal("150.00")
    assert item.preco_unitario == Decimal("180.0000")
    assert resp.json()["itens"][0]["catalogo_preco_desatualizado"] is False


@pytest.mark.django_db
def test_revisar_preco_catalogo_mantendo_valor_renova_data(
    user_admin,
    cliente_com_contato,
):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    produto = Produto.objects.create(
        codigo="CAT-REVALIDA-001",
        descricao="Produto revalidado",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    data_antiga = timezone.now() - timedelta(days=45)
    Produto.objects.filter(pk=produto.pk).update(preco_atualizado_em=data_antiga)
    orc = Orcamento.objects.create(
        codigo_base="O-REVALIDA",
        titulo="Revalidar preço",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        produto=produto,
        descricao=produto.descricao,
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )

    resp = client.post(
        reverse(
            "erp-orcamento-revisar-preco-catalogo-item",
            kwargs={"pk": orc.pk, "item_id": item.pk},
        ),
        {"preco_base": "100.00", "justificativa": "Preço conferido e mantido."},
        format="json",
    )

    assert resp.status_code == 200, resp.content
    produto.refresh_from_db()
    item.refresh_from_db()
    assert produto.preco_base == Decimal("100.00")
    assert produto.preco_atualizado_em > data_antiga
    assert item.custo_unitario == Decimal("100.00")
    assert resp.json()["itens"][0]["catalogo_preco_desatualizado"] is False


@pytest.mark.django_db
def test_reabrir_orcamento_finalizado_volta_rascunho_e_remove_snapshot(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-REABRIR",
        titulo="Reabrir oferta",
        status=StatusOrcamentoChoices.FINALIZADO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("20"),
        preco_unitario=Decimal("120"),
    )
    OrcamentoSnapshot.objects.create(
        orcamento=orc,
        status_orcamento=StatusOrcamentoChoices.FINALIZADO,
        codigo=orc.codigo,
        dados={"status": StatusOrcamentoChoices.FINALIZADO},
        itens=[],
        total=Decimal("120"),
        gerado_por=user,
    )

    resp = client.post(reverse("erp-orcamento-reabrir", kwargs={"pk": orc.pk}))

    assert resp.status_code == 200, resp.content
    body = resp.json()
    assert body["status"] == StatusOrcamentoChoices.RASCUNHO
    assert body["editavel"] is True
    assert body["snapshot_envio"] is None
    assert not OrcamentoSnapshot.objects.filter(orcamento=orc).exists()

    patch_resp = client.patch(
        reverse("erp-orcamento-detail", kwargs={"pk": orc.pk}),
        {"titulo": "Reaberta para edição"},
        format="json",
    )
    assert patch_resp.status_code == 200, patch_resp.content
    assert patch_resp.json()["titulo"] == "Reaberta para edição"


@pytest.mark.django_db
def test_patch_orcamento_enviado_rejeita_sem_itens(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-SEM-ITENS",
        titulo="Sem itens",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"status": StatusOrcamentoChoices.ENVIADO}, format="json")

    assert resp.status_code == 400
    assert "ao menos um" in str(resp.data).lower()
    orc.refresh_from_db()
    assert orc.status == StatusOrcamentoChoices.RASCUNHO
    assert not OrcamentoSnapshot.objects.filter(orcamento=orc).exists()


@pytest.mark.django_db
def test_patch_orcamento_enviado_rejeita_produto_com_custo_zero(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-CUSTO-ZERO",
        titulo="Custo zero",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto sem custo",
        quantidade=1,
        custo_unitario=0,
        preco_unitario=10,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})

    resp = client.patch(url, {"status": StatusOrcamentoChoices.ENVIADO}, format="json")

    assert resp.status_code == 400
    assert "custo maior que zero" in str(resp.data).lower()
    assert not OrcamentoSnapshot.objects.filter(orcamento=orc).exists()


@pytest.mark.django_db
def test_create_orcamento_incrementa_codigo_no_mes(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()

    primeiro = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Primeira", "cliente": str(cliente.id)},
        format="json",
    )
    segundo = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Segunda", "cliente": str(cliente.id)},
        format="json",
    )

    assert primeiro.status_code == 201
    assert segundo.status_code == 201
    base1 = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    base2 = f"Prop-{hoje.month:02d}002-{hoje.year % 100:02d}"
    assert primeiro.json()["codigo"] == base1
    assert segundo.json()["codigo"] == base2


@pytest.mark.django_db
def test_create_orcamento_pula_codigo_existente_no_mes(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()
    codigo_existente = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    Orcamento.objects.create(codigo_base=codigo_existente, titulo="Legado")

    resp = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Nova", "cliente": str(cliente.id)},
        format="json",
    )

    assert resp.status_code == 201
    assert resp.json()["codigo"] == f"Prop-{hoje.month:02d}002-{hoje.year % 100:02d}"


@pytest.mark.django_db
def test_create_orcamento_aplica_margens_do_cliente(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    ConfiguracaoMargemCliente.objects.create(
        cliente=cliente,
        margem_produtos_percentual="10.00",
        margem_servicos_percentual="25.00",
    )
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Com margens",
            "cliente": str(cliente.id),
            "itens": [
                {
                    "tipo": "PRODUTO",
                    "descricao": "Material",
                    "quantidade": "1",
                    "custo_unitario": "100.00",
                },
                {
                    "tipo": "SERVICO",
                    "descricao": "Montagem",
                    "quantidade": "1",
                    "custo_unitario": "200.00",
                },
            ],
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    orcamento = Orcamento.objects.get(pk=resp.json()["id"])
    itens = list(orcamento.itens.order_by("ordem"))
    assert orcamento.margem_produtos_percentual == 10
    assert orcamento.margem_servicos_percentual == 25
    assert itens[0].margem_percentual == 10
    assert itens[0].preco_unitario == 110
    assert itens[1].margem_percentual == 25
    assert itens[1].preco_unitario == 250


@pytest.mark.django_db
def test_create_orcamento_rejeita_contato_de_outro_cliente(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    outro = ParceiroComercial.objects.create(
        documento="98765432000199",
        razao_social="Outro Cliente LTDA",
        eh_cliente=True,
    )
    contato_outro = ContatoParceiro.objects.create(parceiro=outro, nome="Contato errado")
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Contato inválido",
            "cliente": str(cliente.id),
            "contato_cliente": str(contato_outro.id),
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "contato" in str(resp.data).lower()


@pytest.mark.django_db
def test_patch_orcamento_sem_itens_preserva_linhas(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-1",
        titulo="Teste",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    i1 = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao="A",
        quantidade=1,
        preco_unitario=10,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        descricao="B",
        quantidade=2,
        preco_unitario=5,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(url, {"titulo": "Só cabeçalho"}, format="json")
    assert resp.status_code == 200
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 2
    assert Orcamento.objects.get(pk=orc.pk).titulo == "Só cabeçalho"
    assert OrcamentoItem.objects.filter(pk=i1.pk).exists()


@pytest.mark.django_db
def test_create_orcamento_item_produto_catalogo_preco_e_ipi(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-ORC-001",
        descricao="Produto lista IPI",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="150.00",
        ncm="85381000",
    )
    ItemFiscalProduto.objects.create(produto=produto, ordem=0, rotulo="", p_ipi="5.2500")
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Com produto catalogo",
            "cliente": str(cliente.id),
            "margem_produtos_percentual": "10.00",
            "itens": [
                {"produto": str(produto.id), "quantidade": "2"},
            ],
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    item = OrcamentoItem.objects.get(orcamento_id=resp.json()["id"])
    assert item.produto_id == produto.id
    assert item.origem == OrigemItemOrcamentoChoices.CATALOGO
    assert item.tipo == TipoItemOrcamentoChoices.PRODUTO
    assert item.descricao == produto.descricao
    assert item.custo_unitario == 150
    assert item.margem_percentual == 10
    assert item.preco_unitario == Decimal("172.8750")
    assert item.aliquota_ipi == 5.25
    assert resp.json()["itens"][0]["produto_ncm"] == "85381000"


@pytest.mark.django_db
def test_create_orcamento_item_servico_com_produto_rejeita(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-ORC-002",
        descricao="X",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="1.00",
    )
    client = _auth_client(user, raw)
    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Invalido",
            "cliente": str(cliente.id),
            "itens": [
                {"tipo": "SERVICO", "produto": str(produto.id), "descricao": "Servico misto"},
            ],
        },
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_create_orcamento_item_servico_catalogo_aplica_margem(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    servico = Servico.objects.create(
        codigo="SRV-MONT",
        descricao="Montagem de painel",
        categoria="Montagem",
        unidade_medida="HORAS",
        preco_base="180.00",
    )
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Com serviço catálogo",
            "cliente": str(cliente.id),
            "margem_servicos_percentual": "30.00",
            "itens": [
                {"servico": str(servico.id), "quantidade": "4"},
            ],
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    item = OrcamentoItem.objects.get(orcamento_id=resp.json()["id"])
    assert item.servico_id == servico.id
    assert item.produto_id is None
    assert item.origem == OrigemItemOrcamentoChoices.CATALOGO
    assert item.tipo == TipoItemOrcamentoChoices.SERVICO
    assert item.descricao == servico.descricao
    assert item.custo_unitario == 180
    assert item.margem_percentual == 30
    assert item.preco_unitario == 234
    assert item.aliquota_ipi is None
    assert resp.json()["itens"][0]["servico_codigo"] == "SRV-MONT"


@pytest.mark.django_db
def test_atualizar_oferta_reaplica_margens_e_catalogo(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    ConfiguracaoMargemCliente.objects.create(
        cliente=cliente,
        margem_produtos_percentual="20.00",
        margem_servicos_percentual="30.00",
    )
    produto = Produto.objects.create(
        codigo="CAT-ATU-001",
        descricao="Produto atualizado",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    ItemFiscalProduto.objects.create(produto=produto, ordem=0, rotulo="", p_ipi="5.0000")
    servico = Servico.objects.create(
        codigo="SRV-ATU",
        descricao="Serviço atualizado",
        categoria="Engenharia",
        unidade_medida="HORAS",
        preco_base="200.00",
    )
    orc = Orcamento.objects.create(
        codigo_base="O-ATU",
        titulo="Atualizar",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
        margem_produtos_percentual="5.00",
        margem_servicos_percentual="5.00",
    )
    item_produto = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        produto=produto,
        descricao=produto.descricao,
        quantidade=1,
        custo_unitario=80,
        margem_percentual=5,
        preco_unitario=84,
    )
    item_servico = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        tipo=TipoItemOrcamentoChoices.SERVICO,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        servico=servico,
        descricao=servico.descricao,
        quantidade=1,
        custo_unitario=150,
        margem_percentual=5,
        preco_unitario=157.5,
    )
    client = _auth_client(user, raw)

    resp = client.post(reverse("erp-orcamento-atualizar-oferta", kwargs={"pk": orc.pk}))

    assert resp.status_code == 200, resp.content
    assert resp.json()["itens_atualizados"] == 2
    orc.refresh_from_db()
    item_produto.refresh_from_db()
    item_servico.refresh_from_db()
    assert orc.margem_produtos_percentual == Decimal("20.00")
    assert orc.margem_servicos_percentual == Decimal("30.00")
    assert item_produto.custo_unitario == Decimal("100.00")
    assert item_produto.margem_percentual == Decimal("20.00")
    assert item_produto.aliquota_ipi == Decimal("5.0000")
    assert item_produto.preco_unitario == Decimal("125.0000")
    assert item_servico.custo_unitario == Decimal("200.00")
    assert item_servico.margem_percentual == Decimal("30.00")
    assert item_servico.aliquota_ipi is None
    assert item_servico.preco_unitario == Decimal("260.0000")
    assert resp.json()["orcamento"]["margem_produtos_percentual"] == "20.00"


@pytest.mark.django_db
def test_patch_orcamento_ignora_ipi_informado_na_linha(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-IPI-LOCK",
        descricao="Produto IPI fixo",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    ItemFiscalProduto.objects.create(produto=produto, ordem=0, rotulo="", p_ipi="7.5000")
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-IPI",
        titulo="IPI",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao=produto.descricao,
        produto=produto,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        quantidade=1,
        custo_unitario=100,
        preco_unitario=110,
        aliquota_ipi=7.5,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(item.id),
                    "ordem": 0,
                    "descricao": produto.descricao,
                    "quantidade": "1",
                    "custo_unitario": "100",
                    "preco_unitario": "110",
                    "aliquota_ipi": "99.99",
                }
            ]
        },
        format="json",
    )
    assert resp.status_code == 200, resp.content
    item.refresh_from_db()
    assert item.aliquota_ipi == 7.5


@pytest.mark.django_db
def test_patch_orcamento_preserva_origem_configurador_com_produto(
    user_admin, cliente_com_contato
):
    """Salvar linha do CPQ com produto vinculado n?o deve trocar origem para cat?logo."""
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CONF-PROD-01",
        descricao="Contator do painel",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="80.00",
    )
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-CFG",
        titulo="Painel",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
        margem_produtos_percentual="20.00",
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        origem=OrigemItemOrcamentoChoices.CONFIGURADOR,
        descricao="[CCM] Contator",
        produto=produto,
        quantidade=2,
        custo_unitario=80,
        margem_percentual=20,
        preco_unitario=96,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(item.id),
                    "ordem": 0,
                    "tipo": "PRODUTO",
                    "origem": "CONFIGURADOR",
                    "produto": str(produto.id),
                    "descricao": "[CCM] Contator ajustado",
                    "quantidade": "2",
                    "custo_unitario": "85",
                    "margem_percentual": "20",
                }
            ]
        },
        format="json",
    )
    assert resp.status_code == 200, resp.content
    item.refresh_from_db()
    assert item.origem == OrigemItemOrcamentoChoices.CONFIGURADOR
    assert item.descricao == "[CCM] Contator ajustado"
    assert item.custo_unitario == 85
    assert resp.json()["itens"][0]["origem"] == "CONFIGURADOR"
    assert resp.json()["itens"][0]["produto_codigo"] == "CONF-PROD-01"


@pytest.mark.django_db
def test_patch_orcamento_sync_itens_atualiza_adiciona_remove(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-2",
        titulo="Itens",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    manter = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao="Manter",
        quantidade=1,
        preco_unitario=100,
    )
    remover = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        descricao="Remover",
        quantidade=1,
        preco_unitario=1,
    )

    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(manter.id),
                    "ordem": 0,
                    "descricao": "Manter editado",
                    "quantidade": "2",
                    "preco_unitario": "50",
                },
                {
                    "ordem": 1,
                    "descricao": "Linha nova",
                    "quantidade": "1",
                    "preco_unitario": "10",
                },
            ]
        },
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert not OrcamentoItem.objects.filter(pk=remover.pk).exists()
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 2
    manter_db = OrcamentoItem.objects.get(pk=manter.pk)
    assert manter_db.descricao == "Manter editado"
    novo = OrcamentoItem.objects.exclude(pk=manter.pk).get(orcamento=orc)
    assert novo.descricao == "Linha nova"


@pytest.mark.django_db
def test_patch_orcamento_sync_itens_preserva_item_nao_editavel_enviado(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-3",
        titulo="Itens históricos",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    historico = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao="Linha histórica",
        quantidade=1,
        preco_unitario=100,
        editavel=False,
    )
    editavel = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        descricao="Linha editável",
        quantidade=1,
        preco_unitario=10,
    )

    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(historico.id),
                    "ordem": 0,
                    "descricao": "Tentativa ignorada",
                    "quantidade": "9",
                    "preco_unitario": "999",
                },
                {
                    "id": str(editavel.id),
                    "ordem": 1,
                    "descricao": "Linha editável atualizada",
                    "quantidade": "2",
                    "preco_unitario": "20",
                },
            ]
        },
        format="json",
    )

    assert resp.status_code == 200, resp.content
    historico.refresh_from_db()
    editavel.refresh_from_db()
    assert historico.descricao == "Linha histórica"
    assert historico.quantidade == 1
    assert editavel.descricao == "Linha editável atualizada"
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 2
