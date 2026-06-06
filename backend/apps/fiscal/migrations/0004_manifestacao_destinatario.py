from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0003_documentos_fiscais_recebidos"),
    ]

    operations = [
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_status",
            field=models.CharField(
                choices=[
                    ("NAO_SOLICITADA", "Não solicitada"),
                    ("PENDENTE", "Pendente (aguarda ponte A3)"),
                    ("MANIFESTADA", "Registrada na SEFAZ"),
                    ("ERRO", "Erro na última tentativa"),
                ],
                default="NAO_SOLICITADA",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_tipo",
            field=models.CharField(
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
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_justificativa",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_protocolo",
            field=models.CharField(blank=True, max_length=60),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_cstat",
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_motivo",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_solicitada_em",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="documentofiscalrecebido",
            name="manifestacao_registrada_em",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
