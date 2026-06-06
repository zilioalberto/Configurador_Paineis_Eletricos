from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orcamentos", "0014_orcamento_ncm_investimento"),
    ]

    operations = [
        migrations.AddField(
            model_name="orcamento",
            name="investimento_descricao",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Descrição na tabela de investimento (perfil solução completa).",
                max_length=255,
            ),
        ),
    ]
