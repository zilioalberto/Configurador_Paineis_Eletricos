"""Remove a origem de importação legada PONTE_A3.

Converte registros históricos (origem_importacao='PONTE_A3') para 'OUTRO' e
atualiza as choices dos modelos que usam OrigemImportacaoFiscalChoices.
"""
from django.db import migrations, models

MODELOS_COM_ORIGEM = (
    "documentofiscalrecebido",
    "documentofiscalemitido",
    "documentonfserecebido",
)

NOVAS_CHOICES = [
    ("MANUAL", "Manual"),
    ("SEFAZ_SYNC", "Sincronização SEFAZ"),
    ("ADN_SYNC", "Sincronização ADN (NFS-e Nacional)"),
    ("API", "API"),
    ("OUTRO", "Outro"),
]


def converter_ponte_a3_para_outro(apps, schema_editor):
    for nome_modelo in MODELOS_COM_ORIGEM:
        modelo = apps.get_model("fiscal", nome_modelo)
        modelo.objects.filter(origem_importacao="PONTE_A3").update(
            origem_importacao="OUTRO"
        )


def noop_reverse(apps, schema_editor):
    # Sem reversão: os registros migrados ficam como OUTRO.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0013_documentofiscalrecebido_cfop_predominante_and_more"),
    ]

    operations = [
        migrations.RunPython(converter_ponte_a3_para_outro, noop_reverse),
        migrations.AlterField(
            model_name="documentofiscalrecebido",
            name="origem_importacao",
            field=models.CharField(
                choices=NOVAS_CHOICES, default="MANUAL", max_length=30
            ),
        ),
        migrations.AlterField(
            model_name="documentofiscalemitido",
            name="origem_importacao",
            field=models.CharField(
                choices=NOVAS_CHOICES, default="MANUAL", max_length=30
            ),
        ),
        migrations.AlterField(
            model_name="documentonfserecebido",
            name="origem_importacao",
            field=models.CharField(
                choices=NOVAS_CHOICES, default="MANUAL", max_length=30
            ),
        ),
    ]
