from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("fiscal", "0008_documento_fiscal_emitido_public_id"),
    ]

    operations = [
        migrations.AlterField(
            model_name="documentofiscalemitido",
            name="incluir_faturamento",
            field=models.BooleanField(
                default=False,
                help_text="Se verdadeiro, a nota entra na RBT12/projeção DAS. Remessas, devoluções "
                "e CFOPs não mapeados ficam falsos até revisão.",
            ),
        ),
    ]
