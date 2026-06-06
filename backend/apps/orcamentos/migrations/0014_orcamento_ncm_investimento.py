from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orcamentos", "0013_desconto_comercial"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamento",
            name="ncm_investimento",
            field=models.CharField(
                blank=True,
                default="85371090",
                help_text="NCM na tabela de investimento (perfil solução completa). Padrão: painel elétrico.",
                max_length=8,
            ),
        ),
    ]
