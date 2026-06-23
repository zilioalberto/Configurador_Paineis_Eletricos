# Generated manually for SEFAZ distributed document inbox.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0011_obrigacoes_fiscais"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentoSefazDistribuido",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("chave_acesso", models.CharField(max_length=44, unique=True)),
                ("nsu", models.CharField(blank=True, db_index=True, max_length=15, null=True)),
                ("schema", models.CharField(blank=True, max_length=80)),
                (
                    "tipo_documento",
                    models.CharField(
                        choices=[
                            ("RESUMO_NFE", "Resumo NF-e"),
                            ("NFE_COMPLETA", "NF-e completa"),
                            ("EVENTO", "Evento"),
                            ("OUTRO", "Outro"),
                        ],
                        db_index=True,
                        default="RESUMO_NFE",
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("RESUMO_RECEBIDO", "Resumo recebido"),
                            ("AGUARDANDO_MANIFESTACAO", "Aguardando manifestação"),
                            ("MANIFESTADO", "Manifestado"),
                            ("XML_IMPORTADO", "XML completo importado"),
                            ("IGNORADO", "Ignorado"),
                            ("ERRO", "Erro"),
                        ],
                        db_index=True,
                        default="RESUMO_RECEBIDO",
                        max_length=40,
                    ),
                ),
                ("cnpj_emitente", models.CharField(blank=True, db_index=True, max_length=14)),
                ("nome_emitente", models.CharField(blank=True, max_length=255)),
                ("cnpj_destinatario", models.CharField(blank=True, db_index=True, max_length=14)),
                ("nome_destinatario", models.CharField(blank=True, max_length=255)),
                ("data_emissao", models.DateTimeField(blank=True, null=True)),
                ("valor_total", models.DecimalField(decimal_places=2, default=0, max_digits=14)),
                ("situacao_nfe", models.CharField(blank=True, max_length=10)),
                ("protocolo", models.CharField(blank=True, max_length=60)),
                ("recebido_em_sefaz", models.DateTimeField(blank=True, null=True)),
                (
                    "manifestacao_status",
                    models.CharField(
                        choices=[
                            ("NAO_SOLICITADA", "Não solicitada"),
                            ("PENDENTE", "Pendente (aguarda sincronização SEFAZ)"),
                            ("MANIFESTADA", "Registrada na SEFAZ"),
                            ("ERRO", "Erro na última tentativa"),
                        ],
                        default="NAO_SOLICITADA",
                        max_length=30,
                    ),
                ),
                (
                    "manifestacao_tipo",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("CIENCIA", "Ciência da operação"),
                            ("CONFIRMACAO", "Confirmação da operação"),
                            ("DESCONHECIMENTO", "Desconhecimento da operação"),
                            ("NAO_REALIZADA", "Operação não realizada"),
                        ],
                        max_length=30,
                    ),
                ),
                ("manifestacao_justificativa", models.TextField(blank=True)),
                ("manifestacao_protocolo", models.CharField(blank=True, max_length=60)),
                ("manifestacao_cstat", models.CharField(blank=True, max_length=10)),
                ("manifestacao_motivo", models.CharField(blank=True, max_length=255)),
                ("manifestacao_solicitada_em", models.DateTimeField(blank=True, null=True)),
                ("manifestacao_registrada_em", models.DateTimeField(blank=True, null=True)),
                ("xml_resumo", models.TextField(blank=True)),
                ("xml_completo", models.TextField(blank=True)),
                ("ultimo_erro", models.CharField(blank=True, max_length=500)),
                ("criado_em", models.DateTimeField(auto_now_add=True)),
                ("atualizado_em", models.DateTimeField(auto_now=True)),
                (
                    "documento_recebido",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="distribuicoes_sefaz",
                        to="fiscal.documentofiscalrecebido",
                    ),
                ),
            ],
            options={
                "verbose_name": "Documento SEFAZ distribuído",
                "verbose_name_plural": "Documentos SEFAZ distribuídos",
                "ordering": ["-data_emissao", "-criado_em"],
            },
        ),
    ]
